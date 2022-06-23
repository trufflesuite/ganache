import {
  Account,
  EthereumRawAccount,
  QUANTITY,
  Tag
} from "@ganache/ethereum-utils";
import { KECCAK256_NULL } from "ethereumjs-util";
import { Quantity, Data } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { decode } from "@ganache/rlp";
import Blockchain from "../blockchain";
export default class AccountManager {
  #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

  public async get(
    address: Address,
    blockNumber: Buffer | Tag = Tag.latest
  ): Promise<Account | null> {
    const raw = await this.getRaw(address, blockNumber);
    if (raw == null) return null;
    return Account.fromBuffer(raw);
  }

  public async getRaw(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.latest
  ): Promise<Buffer | null> {
    const { trie, blocks } = this.#blockchain;

    // get the block, its state root, and the trie at that state root
    const { stateRoot, number } = (await blocks.get(blockNumber)).header;
    const trieCopy = trie.copy(false);
    trieCopy.setContext(stateRoot.toBuffer(), null, number);

    // get the account from the trie
    return await trieCopy.get(address.toBuffer());
  }

  public async getStorageAt(
    address: Address,
    key: Buffer,
    blockNumber: Buffer | Tag = Tag.latest
  ) {
    const { trie, blocks } = this.#blockchain;

    // get the block, its state root, and the trie at that state root
    const { stateRoot, number } = (await blocks.get(blockNumber)).header;
    const trieCopy = trie.copy(false);
    trieCopy.setContext(stateRoot.toBuffer(), address.toBuffer(), number);

    // get the account from the trie
    return await trieCopy.get(key);
  }

  public async getNonce(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return Quantity.Zero;

    const [nonce] = decode<EthereumRawAccount>(data);
    return nonce.length === 0 ? Quantity.Zero : Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return Quantity.Zero;

    const [, balance] = decode<EthereumRawAccount>(data);
    return balance.length === 0 ? Quantity.Zero : Quantity.from(balance);
  }

  public async getNonceAndBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ) {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return { nonce: Quantity.Zero, balance: Quantity.Zero };

    const [nonce, balance] = decode<EthereumRawAccount>(data);
    return {
      nonce: nonce.length === 0 ? Quantity.Zero : Quantity.from(nonce),
      balance: balance.length === 0 ? Quantity.Zero : Quantity.from(balance)
    };
  }

  public async getCode(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Data> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return Data.Empty;

    const [, , , codeHash] = decode<EthereumRawAccount>(data);
    if (codeHash.equals(KECCAK256_NULL)) return Data.Empty;
    else return this.#blockchain.trie.db.get(codeHash).then(Data.from);
  }
}
