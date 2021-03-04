import { Account, Address, QUANTITY, Tag } from "@ganache/ethereum-utils";
import Trie from "merkle-patricia-tree/baseTrie";
import Blockchain from "../blockchain";

const { RPCQUANTITY_ZERO, BUFFER_EMPTY } = utils;

export default class AccountManager {
  #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

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
    blockNumber: QUANTITY | Buffer | Tag = Tag.LATEST
  ): Promise<Buffer> {
    const blockchain = this.#blockchain;
    const block = await blockchain.blocks.get(blockNumber);
    const trieCopy = new Trie(this.#trie, block.header.stateRoot.toBuffer());
    return new Promise((resolve, reject) => {
      trieCopy.get(keccak(address.toBuffer()), (err: Error, data: Buffer) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  public async getNonce(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    const data = await this.getRaw(address, blockNumber);

    if (data == null) return RPCQUANTITY_ZERO;

    const [nonce] = decode<EthereumRawAccount>(data);
    return nonce.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.LATEST
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
    else return this.#blockchain.trie.db.get(codeHash).then(Data.from);
  }
}
