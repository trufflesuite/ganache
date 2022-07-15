import { Tipset } from "./things/tipset";
import { BlockHeader } from "./things/block-header";
import { CID } from "./things/cid";
import { RootCID } from "./things/root-cid";
import {
  Quantity,
  RandomNumberGenerator,
  uintToBuffer,
  unref
} from "@ganache/utils";
import Emittery from "emittery";
import { DealInfo } from "./things/deal-info";
import { StartDealParams } from "./things/start-deal-params";
import {
  dealIsInProcess,
  StorageDealStatus,
  nextSuccessfulState
} from "./types/storage-deal-status";
import IPFSServer from "./ipfs-server";
import dagCBOR from "ipld-dag-cbor";
import { RetrievalOrder } from "./things/retrieval-order";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
import { QueryOffer } from "./things/query-offer";
import { Ticket } from "./things/ticket";
import { FileRef } from "./things/file-ref";
import fs from "fs";
import path from "path";
import { CID as IPFS_CID } from "ipfs";
import { Account } from "./things/account";
import Database from "./database";
import TipsetManager from "./data-managers/tipset-manager";
import BlockHeaderManager from "./data-managers/block-header-manager";
import { SignedMessage } from "./things/signed-message";
import { Message } from "./things/message";
import { MessageSendSpec } from "./things/message-send-spec";
import { Address, AddressProtocol } from "./things/address";
import { Signature } from "./things/signature";
import { SigType } from "./things/sig-type";
import { Sema } from "async-sema";
import SignedMessageManager from "./data-managers/message-manager";
import BlockMessagesManager from "./data-managers/block-messages-manager";
import { BlockMessages } from "./things/block-messages";
import AccountManager from "./data-managers/account-manager";
import PrivateKeyManager from "./data-managers/private-key-manager";
import { fillGasInformation, getBaseFee, getMinerFee } from "./gas";
import { checkMessage } from "./message";
import DealInfoManager from "./data-managers/deal-info-manager";
import * as bls from "noble-bls12-381";

export type BlockchainEvents = {
  ready: undefined;
  tipset: Tipset;
  minerEnabled: boolean;
  dealUpdate: DealInfo;
};

// Reference implementation: https://git.io/JtEVW
const BurntFundsAddress = Address.fromId(99, true);

export default class Blockchain extends Emittery<BlockchainEvents> {
  public tipsetManager: TipsetManager | null;
  public blockHeaderManager: BlockHeaderManager | null;
  public accountManager: AccountManager | null;
  public privateKeyManager: PrivateKeyManager | null;
  public signedMessagesManager: SignedMessageManager | null;
  public blockMessagesManager: BlockMessagesManager | null;
  public dealInfoManager: DealInfoManager | null;

  readonly miner: Address;
  readonly #miningLock: Sema;
  #minerEnabled: boolean;
  get minerEnabled() {
    return this.#minerEnabled;
  }

  public messagePool: Array<SignedMessage>;
  readonly #messagePoolLock: Sema;

  readonly options: FilecoinInternalOptions;

  private ipfsServer: IPFSServer;
  private miningTimeout: NodeJS.Timeout | null;
  readonly #miningTimeoutLock: Sema;
  private rng: RandomNumberGenerator;

  readonly #database: Database;

  // This is primarily used by Ganache UI to support workspaces
  get dbDirectory(): string | null {
    return this.#database.directory;
  }

  private ready: boolean;
  private stopped: boolean;

  constructor(options: FilecoinInternalOptions) {
    super();
    this.options = options;

    this.rng = new RandomNumberGenerator(this.options.wallet.seed);

    this.miner = Address.fromId(0, false, true);

    this.messagePool = [];
    this.#messagePoolLock = new Sema(1);

    this.ready = false;
    this.stopped = false;

    // Create the IPFS server
    this.ipfsServer = new IPFSServer(this.options.chain);

    this.miningTimeout = null;
    this.#miningTimeoutLock = new Sema(1);
    // to prevent us from stopping while mining or mining
    // multiple times simultaneously
    this.#miningLock = new Sema(1);
    this.#minerEnabled = this.options.miner.mine;

    // We set these to null since they get initialized in
    // an async callback below. We could ignore the TS error,
    // but this is more technically correct (and check for not null later)
    this.tipsetManager = null;
    this.blockHeaderManager = null;
    this.accountManager = null;
    this.privateKeyManager = null;
    this.signedMessagesManager = null;
    this.blockMessagesManager = null;
    this.dealInfoManager = null;

    this.#database = new Database(options.database);
  }

  async initialize() {
    await this.#database.initialize();

    this.blockHeaderManager = await BlockHeaderManager.initialize(
      this.#database.blocks!
    );
    this.tipsetManager = await TipsetManager.initialize(
      this.#database.tipsets!,
      this.blockHeaderManager
    );
    this.privateKeyManager = await PrivateKeyManager.initialize(
      this.#database.privateKeys!
    );
    this.accountManager = await AccountManager.initialize(
      this.#database.accounts!,
      this.privateKeyManager,
      this.#database
    );
    this.signedMessagesManager = await SignedMessageManager.initialize(
      this.#database.signedMessages!
    );
    this.blockMessagesManager = await BlockMessagesManager.initialize(
      this.#database.blockMessages!,
      this.signedMessagesManager
    );
    this.dealInfoManager = await DealInfoManager.initialize(
      this.#database.deals!,
      this.#database.dealExpirations!
    );

    const controllableAccounts =
      await this.accountManager.getControllableAccounts();
    if (controllableAccounts.length === 0) {
      for (let i = 0; i < this.options.wallet.totalAccounts; i++) {
        await this.accountManager.putAccount(
          Account.random(this.options.wallet.defaultBalance, this.rng)
        );
      }
    }

    const recordedGenesisTipset = await this.tipsetManager.getTipsetWithBlocks(
      0
    );
    if (recordedGenesisTipset === null) {
      // Create genesis tipset
      const genesisBlock = new BlockHeader({
        ticket: new Ticket({
          // Reference implementation https://git.io/Jt31s
          vrfProof: this.rng.getBuffer(32)
        }),
        parents: [
          // Both lotus and lotus-devnet always have the Filecoin genesis CID
          // hardcoded here. Reference implementation: https://git.io/Jt3oK
          new RootCID({
            "/": "bafyreiaqpwbbyjo4a42saasj36kkrpv4tsherf2e7bvezkert2a7dhonoi"
          })
        ]
      });

      const genesisTipset = new Tipset({
        blocks: [genesisBlock],
        height: 0
      });

      this.tipsetManager.earliest = genesisTipset; // initialize earliest
      await this.tipsetManager.putTipset(genesisTipset); // sets latest
      await this.#database.db!.put("latest-tipset", uintToBuffer(0));
    } else {
      this.tipsetManager.earliest = recordedGenesisTipset; // initialize earliest
      const data: Buffer = await this.#database.db!.get("latest-tipset");
      const height = Quantity.toNumber(data);
      const latestTipset = await this.tipsetManager.getTipsetWithBlocks(height);
      this.tipsetManager.latest = latestTipset!; // initialize latest
    }

    await this.ipfsServer.start(this.#database.directory!);

    // Fire up the miner if necessary
    if (this.minerEnabled && this.options.miner.blockTime > 0) {
      await this.enableMiner();
    }

    // Get this party started!
    this.ready = true;
    this.emit("ready");

    // Don't log until things are all ready
    this.logLatestTipset();
  }

  async waitForReady() {
    return new Promise(resolve => {
      if (this.ready) {
        resolve(void 0);
      } else {
        this.on("ready", resolve);
      }
    });
  }

  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  async stop() {
    // Don't try to stop if we're already stopped
    if (this.stopped) {
      return;
    }
    this.stopped = true;

    // make sure we wait until other stuff is finished,
    // prevent it from starting up again by not releasing
    await this.#miningLock.acquire();
    await this.#messagePoolLock.acquire();
    await this.#miningTimeoutLock.acquire();

    if (this.miningTimeout) {
      clearTimeout(this.miningTimeout);
    }
    if (this.ipfsServer) {
      await this.ipfsServer.stop();
    }
    if (this.#database) {
      await this.#database.close();
    }
  }

  // using `any` because the IPFS type that should be here can't be exported by
  // api-extractor :-()
  get ipfs(): any | null {
    return this.ipfsServer.node;
  }

  private async intervalMine(mine: boolean = true) {
    await this.#miningTimeoutLock.acquire();

    if (mine) {
      await this.mineTipset();
    }

    this.miningTimeout = setTimeout(
      this.intervalMine.bind(this),
      this.options.miner.blockTime * 1000
    );
    unref(this.miningTimeout);

    this.#miningTimeoutLock.release();
  }

  async enableMiner() {
    this.#minerEnabled = true;
    this.emit("minerEnabled", true);

    if (this.options.miner.blockTime > 0) {
      await this.intervalMine(false);
    }
  }

  async disableMiner() {
    this.#minerEnabled = false;
    this.emit("minerEnabled", false);

    await this.#miningTimeoutLock.acquire();
    if (this.miningTimeout) {
      clearTimeout(this.miningTimeout);
      this.miningTimeout = null;
    }
    this.#miningTimeoutLock.release();
  }

  genesisTipset(): Tipset {
    if (!this.tipsetManager || !this.tipsetManager.earliest) {
      throw new Error(
        "Could not get genesis tipset due to not being initialized yet"
      );
    }
    return this.tipsetManager.earliest;
  }

  latestTipset(): Tipset {
    if (!this.tipsetManager || !this.tipsetManager.latest) {
      throw new Error(
        "Could not get latest tipset due to not being initialized yet"
      );
    }
    return this.tipsetManager.latest;
  }

  // Reference Implementation: https://git.io/JtWnM
  async push(message: Message, spec: MessageSendSpec): Promise<SignedMessage> {
    await this.waitForReady();

    if (message.method !== 0) {
      throw new Error(
        `Unsupported Method (${message.method}); only value transfers (Method: 0) are supported in Ganache.`
      );
    }

    if (message.nonce !== 0) {
      throw new Error(
        `MpoolPushMessage expects message nonce to be 0, was ${message.nonce}`
      );
    }

    // the reference implementation doesn't allow the address to be
    // the ID protocol, but we're only going to support BLS for now
    if (
      Address.parseProtocol(message.from) === AddressProtocol.ID ||
      Address.parseProtocol(message.from) === AddressProtocol.Unknown
    ) {
      throw new Error(
        "The From address is an invalid protocol; please use a BLS or SECP256K1 address."
      );
    }
    if (
      Address.parseProtocol(message.to) === AddressProtocol.ID ||
      Address.parseProtocol(message.to) === AddressProtocol.Unknown
    ) {
      throw new Error(
        "The To address is an invalid protocol; please use a BLS or SECP256K1 address."
      );
    }

    fillGasInformation(message, spec);

    try {
      await this.#messagePoolLock.acquire();

      const account = await this.accountManager!.getAccount(message.from);
      const pendingMessagesForAccount = this.messagePool.filter(
        queuedMessage => queuedMessage.message.from === message.from
      );

      if (pendingMessagesForAccount.length === 0) {
        // account.nonce already stores the "next nonce"
        // don't add more to it
        message.nonce = account.nonce;
      } else {
        // in this case, we have messages in the pool with
        // already incremented nonces (account.nonce only
        // increments when the block is mined). this will
        // generate a nonce greater than any other nonce
        const nonceFromPendingMessages = pendingMessagesForAccount.reduce(
          (nonce, m) => {
            return Math.max(nonce, m.message.nonce);
          },
          account.nonce
        );
        message.nonce = nonceFromPendingMessages + 1;
      }

      // check if enough funds
      const messageBalanceRequired =
        message.gasFeeCap * BigInt(message.gasLimit) + message.value;
      const pendingBalanceRequired = pendingMessagesForAccount.reduce(
        (balanceSpent, m) => {
          return (
            balanceSpent +
            m.message.gasFeeCap * BigInt(m.message.gasLimit) +
            m.message.value
          );
        },
        0n
      );
      const totalRequired = messageBalanceRequired + pendingBalanceRequired;
      if (account.balance.value < totalRequired) {
        throw new Error(
          `mpool push: not enough funds: ${
            account.balance.value - pendingBalanceRequired
          } < ${messageBalanceRequired}`
        );
      }

      // sign the message
      const signature = await account.address.signMessage(message);
      const signedMessage = new SignedMessage({
        Message: message.serialize(),
        Signature: new Signature({
          type: SigType.SigTypeBLS,
          data: signature
        }).serialize()
      });

      // add to pool
      await this.pushSigned(signedMessage, false);

      this.#messagePoolLock.release();

      return signedMessage;
    } catch (e) {
      this.#messagePoolLock.release();
      throw e;
    }
  }

  async pushSigned(
    signedMessage: SignedMessage,
    acquireLock: boolean = true
  ): Promise<RootCID> {
    const error = await checkMessage(signedMessage);
    if (error) {
      throw error;
    }

    try {
      if (acquireLock) {
        await this.#messagePoolLock.acquire();
      }

      this.messagePool.push(signedMessage);

      if (acquireLock) {
        this.#messagePoolLock.release();
      }

      if (this.minerEnabled && this.options.miner.blockTime === 0) {
        // we should instamine this message
        // purposely not awaiting on this as we'll
        // deadlock for Filecoin.MpoolPushMessage calls
        this.mineTipset();
      }

      return new RootCID({
        root: signedMessage.cid
      });
    } catch (e) {
      if (acquireLock) {
        this.#messagePoolLock.release();
      }
      throw e;
    }
  }

  // Reference implementation: https://git.io/Jt2lh
  // I don't believe the reference implementation translates very
  // easily to our architecture. The implementation below mimics
  // the desired behavior
  async mpoolClear(local: boolean): Promise<void> {
    await this.waitForReady();

    try {
      await this.#messagePoolLock.acquire();

      if (local) {
        this.messagePool = [];
      } else {
        const localAccounts =
          await this.accountManager!.getControllableAccounts();
        const localAddressStrings = localAccounts.map(
          account => account.address.value
        );
        this.messagePool = this.messagePool.filter(signedMessage => {
          return localAddressStrings.includes(signedMessage.message.from);
        });
      }

      this.#messagePoolLock.release();
    } catch (e) {
      this.#messagePoolLock.release();
      throw e;
    }
  }

  // Reference implementation: https://git.io/Jt28F
  // The below implementation makes the assumption that
  // it's not possible for the user to request a valid
  // tipset key that is greater than the message pools
  // pending height. This just cannot happen with the
  // current design of Ganache. I believe this scenario
  // would happen in other networks because of syncing
  // issues preventing the state to always be at the
  // network head.
  async mpoolPending(): Promise<Array<SignedMessage>> {
    await this.waitForReady();

    try {
      await this.#messagePoolLock.acquire();

      // this does a pseudo clone so that what we send
      // won't change after the lock is released but before
      // it goes out the api
      const pendingMessages = this.messagePool.map(
        sm => new SignedMessage(sm.serialize())
      );

      this.#messagePoolLock.release();

      return pendingMessages;
    } catch (e) {
      this.#messagePoolLock.release();
      throw e;
    }
  }

  // Note that this is naive - it always assumes the first block in the
  // previous tipset is the parent of the new blocks.
  async mineTipset(numNewBlocks: number = 1): Promise<void> {
    await this.waitForReady();

    try {
      await this.#miningLock.acquire();

      // let's grab the messages going into the next tipset
      // immediately and clear the message pool for the next tipset
      let nextMessagePool: Array<SignedMessage>;
      try {
        await this.#messagePoolLock.acquire();
        nextMessagePool = ([] as Array<SignedMessage>).concat(this.messagePool);
        this.messagePool = [];
        this.#messagePoolLock.release();
      } catch (e) {
        this.#messagePoolLock.release();
        throw e;
      }

      const previousTipset: Tipset = this.latestTipset();
      const newTipsetHeight = previousTipset.height + 1;

      const newBlocks: Array<BlockHeader> = [];

      for (let i = 0; i < numNewBlocks; i++) {
        newBlocks.push(
          new BlockHeader({
            miner: this.miner,
            parents: [previousTipset.cids[0]],
            height: newTipsetHeight,
            // Determined by interpreting the description of `weight`
            // as an accumulating weight of win counts (which default to 1)
            // See the description here: https://spec.filecoin.io/#section-glossary.weight
            parentWeight:
              BigInt(previousTipset.blocks[0].electionProof.winCount) +
              previousTipset.blocks[0].parentWeight
          })
        );
      }

      if (nextMessagePool.length > 0) {
        const successfulMessages: SignedMessage[] = [];
        const blsSignatures: Buffer[] = [];
        for (const signedMessage of nextMessagePool) {
          const { from, to, value } = signedMessage.message;

          const baseFee = getBaseFee();
          if (baseFee !== 0) {
            const successful = await this.accountManager!.transferFunds(
              from,
              BurntFundsAddress.value,
              getMinerFee(signedMessage.message)
            );

            if (!successful) {
              // While we should have checked this when the message was sent,
              // we double check here just in case
              const fromAccount = await this.accountManager!.getAccount(from);
              console.warn(
                `Could not burn the base fee of ${baseFee} attoFIL from address ${from} due to lack of funds. ${fromAccount.balance.value} attoFIL available`
              );
              continue;
            }
          }

          // send mining funds
          let successful = await this.accountManager!.transferFunds(
            from,
            this.miner.value,
            getMinerFee(signedMessage.message)
          );

          if (!successful) {
            // While we should have checked this when the message was sent,
            // we double check here just in case
            const fromAccount = await this.accountManager!.getAccount(from);
            console.warn(
              `Could not transfer the mining fees of ${getMinerFee(
                signedMessage.message
              )} attoFIL from address ${from} due to lack of funds. ${
                fromAccount.balance.value
              } attoFIL available`
            );
            continue;
          }

          successful = await this.accountManager!.transferFunds(
            from,
            to,
            value
          );

          if (!successful) {
            // While we should have checked this when the message was sent,
            // we double check here just in case
            const fromAccount = await this.accountManager!.getAccount(from);
            console.warn(
              `Could not transfer ${value} attoFIL from address ${from} to address ${to} due to lack of funds. ${fromAccount.balance.value} attoFIL available`
            );

            // do not revert miner transfer as the miner attempted to mine
            continue;
          }

          this.accountManager!.incrementNonce(from);

          successfulMessages.push(signedMessage);

          if (signedMessage.signature.type === SigType.SigTypeBLS) {
            blsSignatures.push(signedMessage.signature.data);
          }
        }

        if (blsSignatures.length > 0) {
          newBlocks[0].blsAggregate = new Signature({
            type: SigType.SigTypeBLS,
            data: Buffer.from(bls.aggregateSignatures(blsSignatures).buffer)
          });
        } else {
          newBlocks[0].blsAggregate = new Signature({
            type: SigType.SigTypeBLS,
            data: Buffer.from([])
          });
        }

        await this.blockMessagesManager!.putBlockMessages(
          newBlocks[0].cid,
          BlockMessages.fromSignedMessages(successfulMessages)
        );
      }

      const newTipset = new Tipset({
        blocks: newBlocks,
        height: newTipsetHeight
      });

      await this.tipsetManager!.putTipset(newTipset);
      await this.#database.db!.put(
        "latest-tipset",
        uintToBuffer(newTipsetHeight)
      );

      // Advance the state of all deals in process.
      const currentDeals = await this.dealInfoManager!.getDeals();
      const inProcessDeals = currentDeals.filter(deal =>
        dealIsInProcess(deal.state)
      );
      for (const deal of inProcessDeals) {
        deal.advanceState();
        await this.dealInfoManager!.updateDealInfo(deal);
        this.emit("dealUpdate", deal);
      }

      // Process deal expirations
      const activeDeals = currentDeals.filter(
        deal => deal.state === StorageDealStatus.Active
      );
      for (const deal of activeDeals) {
        const expirationTipset = await this.dealInfoManager!.getDealExpiration(
          deal.proposalCid
        );
        if (expirationTipset !== null && newTipset.height > expirationTipset) {
          deal.state = StorageDealStatus.Expired;
          await this.dealInfoManager!.updateDealInfo(deal);
          this.emit("dealUpdate", deal);
        }
      }

      this.logLatestTipset();

      this.emit("tipset", newTipset);

      this.#miningLock.release();
    } catch (e) {
      this.#miningLock.release();
      throw e;
    }
  }

  async hasLocal(cid: string): Promise<boolean> {
    if (!this.ipfsServer.node) {
      return false;
    }

    try {
      // This stat will fail if the object doesn't exist.
      await this.ipfsServer.node.object.stat(cid, {
        timeout: 500 // Enforce a timeout; otherwise will hang if CID not found
      });
      return true;
    } catch {
      return false;
    }
  }

  private async getIPFSObjectSize(cid: string): Promise<number> {
    if (!this.ipfsServer.node) {
      return 0;
    }

    const stat = await this.ipfsServer.node.object.stat(cid, {
      timeout: 500 // Enforce a timeout; otherwise will hang if CID not found
    });

    return stat.CumulativeSize;
  }

  private async downloadFile(cid: string, ref: FileRef): Promise<void> {
    if (!this.ipfsServer.node) {
      throw new Error("IPFS server is not running");
    }

    const dirname = path.dirname(ref.path);
    let fileStream: fs.WriteStream;
    try {
      try {
        if (!fs.existsSync(dirname)) {
          await fs.promises.mkdir(dirname, { recursive: true });
        }
        fileStream = fs.createWriteStream(`${ref.path}.partial`, {
          encoding: "binary"
        });
      } catch (e: any) {
        throw new Error(
          `Could not create file.\n  CID: ${cid}\n  Path: ${
            ref.path
          }\n  Error: ${e.toString()}`
        );
      }

      const chunks = this.ipfsServer.node.files.read(new IPFS_CID(cid), {
        timeout: 500 // Enforce a timeout; otherwise will hang if CID not found
      });

      for await (const chunk of chunks) {
        try {
          await new Promise<void>((resolve, reject) => {
            const shouldContinue = fileStream.write(chunk, error => {
              if (error) {
                reject(error);
              } else {
                if (shouldContinue) {
                  resolve();
                } else {
                  fileStream.once("drain", resolve);
                }
              }
            });
          });
        } catch (e: any) {
          throw new Error(
            `Could not save file.\n  CID: ${cid}\n  Path: ${
              ref.path
            }\n  Error: ${e.toString()}`
          );
        }
      }

      await fs.promises.rename(`${ref.path}.partial`, ref.path);
    } finally {
      // @ts-ignore
      if (fileStream) {
        fileStream.close();
      }
    }
  }

  async startDeal(proposal: StartDealParams): Promise<RootCID> {
    await this.waitForReady();

    if (!proposal.wallet) {
      throw new Error(
        "StartDealParams.Wallet not provided and is required to start a storage deal."
      );
    }

    // have to specify type since node types are not correct
    const account = await this.accountManager!.getAccount(
      proposal.wallet.value
    );
    if (!account.address.privateKey) {
      throw new Error(
        `Invalid StartDealParams.Wallet provided. Ganache doesn't have the private key for account with address ${proposal.wallet.value}`
      );
    }

    const signature = await account.address.signProposal(proposal);

    const proposalRawCid = await dagCBOR.util.cid(signature.toString("hex"));
    const proposalCid = new CID(proposalRawCid.toString());

    const currentDeals = await this.dealInfoManager!.getDeals();
    let deal = new DealInfo({
      proposalCid: new RootCID({
        root: proposalCid
      }),
      state: StorageDealStatus.Validating, // Not sure if this is right, but we'll start here
      message: "",
      provider: this.miner,
      pieceCid: proposal.data.pieceCid,
      size:
        proposal.data.pieceSize ||
        (await this.getIPFSObjectSize(proposal.data.root.root.value)),
      pricePerEpoch: proposal.epochPrice,
      duration: proposal.minBlocksDuration,
      dealId: currentDeals.length + 1
    });

    // prepare future deal expiration
    const activeTipsetHeight =
      this.latestTipset().height + Object.keys(nextSuccessfulState).length - 1;
    const expirationTipsetHeight = activeTipsetHeight + deal.duration;

    await this.dealInfoManager!.addDealInfo(deal, expirationTipsetHeight);
    this.emit("dealUpdate", deal);

    // If we're automining, mine a new block. Note that this will
    // automatically advance the deal to the active state.
    if (this.minerEnabled && this.options.miner.blockTime === 0) {
      while (deal.state !== StorageDealStatus.Active) {
        await this.mineTipset();
        deal = (await this.dealInfoManager!.get(deal.proposalCid.root.value))!;
      }
    }

    // Subtract the cost from our current balance
    const totalPrice = BigInt(deal.pricePerEpoch) * BigInt(deal.duration);
    await this.accountManager!.transferFunds(
      proposal.wallet.value,
      proposal.miner.value,
      totalPrice
    );

    return deal.proposalCid;
  }

  async createQueryOffer(rootCid: RootCID): Promise<QueryOffer> {
    await this.waitForReady();

    const size = await this.getIPFSObjectSize(rootCid.root.value);

    return new QueryOffer({
      root: rootCid,
      size: size,
      miner: this.miner,
      minPrice: BigInt(size * 2) // This seems to be what powergate does
    });
  }

  async retrieve(retrievalOrder: RetrievalOrder, ref: FileRef): Promise<void> {
    await this.waitForReady();

    const hasLocal: boolean = await this.hasLocal(
      retrievalOrder.root.root.value
    );

    const account = await this.accountManager!.getAccount(
      retrievalOrder.client.value
    );
    if (!account.address.privateKey) {
      throw new Error(
        `Invalid RetrievalOrder.Client provided. Ganache doesn't have the private key for account with address ${retrievalOrder.client}`
      );
    }

    if (!hasLocal) {
      throw new Error(`Object not found: ${retrievalOrder.root.root.value}`);
    }

    await this.downloadFile(retrievalOrder.root.root.value, ref);

    await this.accountManager!.transferFunds(
      retrievalOrder.client.value,
      retrievalOrder.miner.value,
      retrievalOrder.total
    );
  }

  // Reference implementation: https://git.io/Jt7eQ
  async getTipsetFromKey(tipsetKey?: Array<RootCID>): Promise<Tipset> {
    await this.waitForReady();

    if (!tipsetKey || tipsetKey.length === 0) {
      return this.tipsetManager!.latest!;
    }

    // Instead of using the `LoadTipSet` implementation
    // found in the reference implementation, we can greatly
    // simplify the process due to our current "a block can
    // only be part of one tipset". This is a special condition
    // of Ganache due to not dealing with a real network.
    for (const cid of tipsetKey) {
      const cidString = cid.root.value;
      const blockHeader = await this.blockHeaderManager!.get(
        Buffer.from(cidString)
      );
      if (blockHeader) {
        const tipset = await this.tipsetManager!.getTipsetWithBlocks(
          blockHeader.height
        );
        if (tipset) {
          return tipset;
        }
      }
    }

    throw new Error("Could not retrieve tipset from tipset key");
  }

  // Reference implementation: https://git.io/Jt7vk
  async getTipsetByHeight(
    height: number,
    tipsetKey?: Array<RootCID>
  ): Promise<Tipset> {
    await this.waitForReady();

    let tipset: Tipset | null = await this.getTipsetFromKey(tipsetKey);

    // Reference implementation: https://git.io/Jt7vI
    if (height > tipset.height) {
      throw new Error(
        "looking for tipset with height greater than start point"
      );
    }

    if (height === tipset.height) {
      return tipset;
    }

    // The reference implementation then calls `cs.cindex.GetTipsetByHeight`
    // which is specific to their blockchain implementation of needing to
    // walk back different caches. The way ganache stores these currently
    // is much simpler, and we can fetch the tipset directly from the height
    tipset = await this.tipsetManager!.getTipsetWithBlocks(height);
    if (tipset) {
      return tipset;
    } else {
      throw new Error("Could not find tipset with the provided height");
    }
  }

  async createAccount(protocol: AddressProtocol): Promise<Account> {
    await this.waitForReady();

    const account = Account.random(0, this.rng, protocol);
    await this.accountManager!.putAccount(account);
    return account;
  }

  private logLatestTipset() {
    const date = new Date().toISOString();
    const tipset = this.latestTipset();

    this.options.logging.logger.log(
      `${date} INFO New heaviest tipset! [${tipset.cids[0].root.value}] (height=${tipset.height})`
    );
  }
}
