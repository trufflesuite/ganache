import Trie from "merkle-patricia-tree/baseTrie";
import { KECCAK256_NULL } from "ethereumjs-util";
import { LevelUp } from "levelup";
import { Account, EthereumRawAccount, Tag } from "@ganache/ethereum-utils";
import { utils, Quantity, Data } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { decode } from "@ganache/rlp";
import Blockchain from "../blockchain";
import { promisify } from "util";

const { keccak, RPCQUANTITY_ZERO, BUFFER_EMPTY } = utils;

const GET_CODE = "eth_getCode";
const GET_NONCE = "eth_getTransactionCount";
const GET_BALANCE = "eth_getBalance";

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
    blockNumber: string | Buffer | Tag = Tag.LATEST,
    stateRoot: Data
  ) => {
    const { fallback } = this.#blockchain;

    // get nonce, balance, and code from the fork/fallback
    const codeProm = fallback.request<string>(GET_CODE, [address, blockNumber]);
    const promises = [
      fallback.request<string>(GET_NONCE, [address, blockNumber]),
      fallback.request<string>(GET_BALANCE, [address, blockNumber])
    ] as [nonce: Promise<string>, balance: Promise<string>];

    // create an account so we can serialize everything later
    const account = new Account(address);
    account.stateRoot = stateRoot.toBuffer();

    // because code requires additional asyncronous processing, we await and
    // process it ASAP
    const codeHex = await codeProm;
    if (codeHex != "0x") {
      const code = Data.from(codeHex).toBuffer();
      // the codeHash is just the keccak hash of the code itself
      account.codeHash = keccak(code);
      // insert the code into the database with a key of `codeHash`
      promises.push(this.#trie.put(account.codeHash, code));
    }

    // finally, set the `nonce` and `balance` on the account before returning
    /// the serialized data
    const [nonce, balance] = await Promise.all(promises);
    account.nonce = Quantity.from(nonce);
    account.balance = Quantity.from(balance);

    return account.serialize();
  };

  public async get(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.LATEST
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
    let data = await promisify(trie.get.bind(trie))(keccak(address.toBuffer()));
    if (data == null) {
      // if we don't have data, check the fallback
      if (blockchain.fallback)
        return await this.fromFallback(address, blockNumber, stateRoot);
      else return null;
    } else return data;
  }

  public async getNonce(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return RPCQUANTITY_ZERO;

    const [nonce] = decode<EthereumRawAccount>(data);
    return nonce.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.LATEST
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
