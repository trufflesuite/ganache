import { BaseTrie as Trie } from "merkle-patricia-tree";
import { KECCAK256_NULL } from "ethereumjs-util";
import { LevelUp } from "levelup";
import { Account, EthereumRawAccount, Tag } from "@ganache/ethereum-utils";
import { utils, Quantity, Data } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { decode, encode } from "@ganache/rlp";
import Blockchain from "../blockchain";
import { BUFFER_ZERO } from "@ganache/utils/src/utils";
import { attachCookies } from "superagent";

const { keccak, RPCQUANTITY_EMPTY, RPCQUANTITY_ZERO, BUFFER_EMPTY } = utils;

const GET_CODE = "eth_getCode";
const GET_NONCE = "eth_getTransactionCount";
const GET_BALANCE = "eth_getBalance";
const GET_STORAGE_AT = "eth_getStorageAt";

export default class AccountManager {
  #blockchain: Blockchain;
  #trie: LevelUp;

  constructor(blockchain: Blockchain, trie: LevelUp) {
    this.#blockchain = blockchain;
    this.#trie = trie;
  }

  /**
   * Gets an account from the fork/fallback.
   *
   * @param address the address of the account
   * @param blockNumber the block number at which to query the fork/fallback.
   * @param stateRoot the state root at the given blockNumber
   */
  fromFallback = async (
    address: Address,
    blockNumber: string | Tag = Tag.LATEST
  ) => {
    const { fallback } = this.#blockchain;

    // get nonce, balance, and code from the fork/fallback
    const codeProm = fallback.request<string>(GET_CODE, [address, blockNumber]);
    const promises = [
      fallback.request<string>(GET_NONCE, [address, blockNumber]),
      fallback.request<string>(GET_BALANCE, [address, blockNumber]),
      null
    ] as [nonce: Promise<string>, balance: Promise<string>, put: Promise<void>];

    // create an account so we can serialize everything later
    const account = new Account(address);

    // because code requires additional asynchronous processing, we await and
    // process it ASAP
    const codeHex = await codeProm;
    if (codeHex !== "0x") {
      const code = Data.from(codeHex).toBuffer();
      // the codeHash is just the keccak hash of the code itself
      account.codeHash = keccak(code);
      if (!account.codeHash.equals(KECCAK256_NULL)) {
        // insert the code into the database with a key of `codeHash`
        promises[2] = this.#trie.put(account.codeHash, code);
      }
    }

    // finally, set the `nonce` and `balance` on the account before returning
    /// the serialized data
    const [nonce, balance] = await Promise.all(promises);
    account.nonce =
      nonce === "0x0" ? RPCQUANTITY_EMPTY : Quantity.from(nonce, true);
    account.balance =
      balance === "0x0" ? RPCQUANTITY_EMPTY : Quantity.from(balance);

    return account.serialize();
  };

  public async get(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Account | null> {
    const raw = await this.getRaw(address, blockNumber);
    if (raw == null) return null;
    return Account.fromBuffer(raw);
  }

  public async getRaw(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ): Promise<Buffer | null> {
    const blockchain = this.#blockchain;

    // get the block, its state root, and a trie at that state root
    const { stateRoot } = (await blockchain.blocks.get(blockNumber)).header;
    const trie = new Trie(this.#trie, stateRoot.toBuffer());

    // get the account from the trie
    const key = keccak(address.toBuffer());
    let data = await trie.get(key);
    if (data == null) {
      // if we don't have data, check the fallback
      if (blockchain.fallback) {
        const data = await this.fromFallback(
          address,
          typeof blockNumber === "string"
            ? blockNumber
            : `0x${blockNumber.toString("hex")}`
        );
        if (data) {
          return data;
        } else {
          return null;
        }
      } else return null;
    } else return data;
  }

  public async getStorageAt(
    address: Address,
    key: Buffer,
    blockNumber: Buffer | Tag = Tag.LATEST
  ) {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return BUFFER_ZERO;

    const [, , stateRoot] = decode<EthereumRawAccount>(data);

    const trie = new Trie(this.#trie, stateRoot);
    const storage = await trie.get(keccak(key));
    if (storage != null) return storage;

    // if we don't have data, check the fallback
    const { fallback } = this.#blockchain;
    if (!fallback) return null;

    const result = await fallback.request<string>(GET_STORAGE_AT, [
      address.toString(),
      "0x" + key.toString("hex"),
      typeof blockNumber === "string"
        ? blockNumber
        : `0x${blockNumber.toString("hex")}`
    ]);

    if (!result) return null;

    // remove the `0x` and all leading 0 pairs:
    const compressed = result.replace(/^0x(00)*/, "");
    const buf = Buffer.from(compressed, "hex");
    return encode(buf);
  }

  public async getNonce(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return RPCQUANTITY_ZERO;

    const [nonce] = decode<EthereumRawAccount>(data);
    return nonce.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return RPCQUANTITY_ZERO;

    const [, balance] = decode<EthereumRawAccount>(data);
    return balance.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(balance);
  }

  public async getCode(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ): Promise<Data> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return Data.from(BUFFER_EMPTY);

    const [, , , codeHash] = decode<EthereumRawAccount>(data);
    if (codeHash.equals(KECCAK256_NULL)) return Data.from(BUFFER_EMPTY);
    else return this.#trie.get(codeHash).then(Data.from);
  }
}
