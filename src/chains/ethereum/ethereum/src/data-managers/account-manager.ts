import { KECCAK256_NULL } from "ethereumjs-util";
import { Account, EthereumRawAccount, Tag } from "@ganache/ethereum-utils";
import { Quantity, Data, BUFFER_EMPTY, RPCQUANTITY_ZERO } from "@ganache/utils";
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
    blockNumber: Buffer | Tag = Tag.LATEST
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
    blockNumber: string | Tag = Tag.LATEST
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
    else return this.#blockchain.trie.db.get(codeHash).then(Data.from);
  }
}
