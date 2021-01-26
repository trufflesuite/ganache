import { Account, Address, Tag } from "@ganache/ethereum-utils";
import Trie from "merkle-patricia-tree/baseTrie";
import Blockchain from "../blockchain";
import { LevelUp } from "levelup";
import { rlp } from "ethereumjs-util";
import { utils, Quantity, Data } from "@ganache/utils";

const { keccak, RPCQUANTITY_ZERO } = utils;

export default class AccountManager {
  #blockchain: Blockchain;
  #trie: LevelUp;
  constructor(blockchain: Blockchain, trie: LevelUp) {
    this.#blockchain = blockchain;
    this.#trie = trie;
  }

  #fromFallback = async (
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ) => {
    const fallback = this.#blockchain.fallback;
    const [nonce, balance, codeHash] = await Promise.all([
      fallback
        .request("eth_getTransactionCount", [address, blockNumber])
        .then(Quantity.from),
      fallback
        .request("eth_getBalance", [address, blockNumber])
        .then(Quantity.from),
      fallback.request("eth_getCode", [address, blockNumber]).then(Data.from)
    ]);
    const account = new Account(address);
    account.nonce = nonce;
    account.balance = balance;
    account.stateRoot = null;
    if (codeHash) {
      account.codeHash = codeHash.toBuffer();
    }
    return account.serialize();
  };

  public async getRaw(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Buffer> {
    const blockchain = this.#blockchain;
    const block = await blockchain.blocks.get(blockNumber);
    const trieCopy = new Trie(this.#trie, block.header.stateRoot.toBuffer());
    return new Promise((resolve, reject) => {
      trieCopy.get(keccak(address.toBuffer()), (err: Error, data: Buffer) => {
        if (err) return reject(err);
        if (data == null && blockchain.fallback) {
          resolve(this.#fromFallback(address, blockNumber));
        } else {
          resolve(data);
        }
      });
    });
  }

  public async getNonce(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    return this.getRaw(address, blockNumber).then(data => {
      if (data) {
        const [nonce] = (rlp.decode(data) as any) as Buffer[];
        return nonce.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(nonce);
      } else {
        return RPCQUANTITY_ZERO;
      }
    });
  }

  public async getBalance(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    return this.getRaw(address, blockNumber).then(data => {
      if (data) {
        const [, balance] = (rlp.decode(data) as any) as Buffer[];
        return balance.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(balance);
      } else {
        return RPCQUANTITY_ZERO;
      }
    });
  }

  public async get(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Account> {
    return this.getRaw(address, blockNumber).then(data => {
      return Account.fromBuffer(data);
    });
  }
}
