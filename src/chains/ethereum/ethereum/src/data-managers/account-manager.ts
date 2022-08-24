import {
  GanacheTrie,
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

  /**
   * Creates a copy of the trie that was used to mine the specified
   * `blockNumber`. Sets the context of the trie to the state root and number
   * of `blockNumber`.
   * @param blockNumber
   * @returns
   */
  public async getTrieAt(blockNumber: string | Buffer | Tag = Tag.latest) {
    const { trie, blocks } = this.#blockchain;

    const block = await blocks.get(blockNumber);
    const blockTrie = block.getTrie();
    // if the block has its own trie stored, use that. otherwise copy from the
    // chain's trie
    const trieCopy = blockTrie || trie.copy(false);
    const { stateRoot, number } = block.header;
    trieCopy.setContext(stateRoot.toBuffer(), null, number);
    return { trie: trieCopy };
  }

  public async getRaw(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.latest
  ): Promise<{ raw: Buffer | null; trie: GanacheTrie }> {
    // get the block, its state root, and the trie at that state root
    const { trie } = await this.getTrieAt(blockNumber);

    // get the account from the trie
    const raw = await trie.get(address.toBuffer());
    return { raw, trie };
  }

  public async getStorageAt(
    address: Address,
    key: Buffer,
    blockNumber: string | Buffer | Tag = Tag.latest
  ) {
    // get the block, its state root, and the trie at that state root
    const { trie } = await this.getTrieAt(blockNumber);
    const number = this.#blockchain.blocks.getEffectiveNumber(blockNumber);
    const addressBuf = address.toBuffer();
    const addressData = await trie.get(addressBuf);
    const [, , addressStateRoot] = decode<EthereumRawAccount>(addressData);
    trie.setContext(addressStateRoot, addressBuf, number);

    // get the account from the trie
    return await trie.get(key);
  }

  public async getNonce(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Quantity> {
    const { raw } = await this.getRaw(address, blockNumber);

    if (raw == null) return Quantity.Zero;

    const [nonce] = decode<EthereumRawAccount>(raw);
    return nonce.length === 0 ? Quantity.Zero : Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Quantity> {
    const { raw } = await this.getRaw(address, blockNumber);

    if (raw == null) return Quantity.Zero;

    const [, balance] = decode<EthereumRawAccount>(raw);
    return balance.length === 0 ? Quantity.Zero : Quantity.from(balance);
  }

  public async getNonceAndBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ) {
    const { raw } = await this.getRaw(address, blockNumber);

    if (raw == null) return { nonce: Quantity.Zero, balance: Quantity.Zero };

    const [nonce, balance] = decode<EthereumRawAccount>(raw);
    return {
      nonce: nonce.length === 0 ? Quantity.Zero : Quantity.from(nonce),
      balance: balance.length === 0 ? Quantity.Zero : Quantity.from(balance)
    };
  }

  public async getCode(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Data> {
    const { raw, trie } = await this.getRaw(address, blockNumber);

    if (raw == null) return Data.Empty;

    const [, , , codeHash] = decode<EthereumRawAccount>(raw);
    if (codeHash.equals(KECCAK256_NULL)) return Data.Empty;
    else return trie.db.get(codeHash).then(Data.from);
  }
}
