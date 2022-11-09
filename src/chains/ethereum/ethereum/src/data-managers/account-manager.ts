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
import { PendingBlock } from "@ganache/ethereum-block";
export default class AccountManager {
  #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

  /**
   * Creates a copy of the trie at the time in which the block represented by
   * `blockNumber` was mined. For most blocks, the overall blockchain's `trie`
   * property will be used. However, a pending block's data is never saved to
   * the blockchain's `trie`, so the trie will be retrieved from the block
   * itself. Sets the context of the trie to the state root and number of
   * `blockNumber`.
   * @param blockNumber
   * @returns {GanacheTrie}
   */
  public async getTrieAt(blockNumber: string | Buffer | Tag = Tag.latest) {
    const { trie, blocks } = this.#blockchain;

    const block = await blocks.get(blockNumber);
    // a pending block has a copy of the trie at the time the block was made.
    // for a regular block we can use the current trie
    const trieCopy =
      block instanceof PendingBlock ? block.trie : trie.copy(false);
    const { stateRoot, number } = block.header;
    trieCopy.setContext(stateRoot.toBuffer(), null, number);
    return trieCopy;
  }

  public async getRawAccountAndTrie(
    address: Address,
    blockNumber: string | Buffer | Tag = Tag.latest
  ): Promise<{ rawAccount: Buffer | null; trie: GanacheTrie }> {
    // get the block, its state root, and the trie at that state root
    const trie = await this.getTrieAt(blockNumber);

    // get the account from the trie
    const rawAccount = await trie.get(address.toBuffer());
    return { rawAccount: rawAccount, trie };
  }

  public async getStorageAt(
    address: Address,
    key: Buffer,
    blockNumber: string | Buffer | Tag = Tag.latest
  ) {
    // get the block, its state root, and the trie at that state root
    const trie = await this.getTrieAt(blockNumber);
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
    const { rawAccount } = await this.getRawAccountAndTrie(
      address,
      blockNumber
    );

    if (rawAccount == null) return Quantity.Zero;

    const [nonce] = decode<EthereumRawAccount>(rawAccount);
    return Quantity.from(nonce);
  }

  public async getBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Quantity> {
    const { rawAccount } = await this.getRawAccountAndTrie(
      address,
      blockNumber
    );

    if (rawAccount == null) return Quantity.Zero;

    const [, balance] = decode<EthereumRawAccount>(rawAccount);
    return Quantity.from(balance);
  }

  public async getNonceAndBalance(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ) {
    const { rawAccount } = await this.getRawAccountAndTrie(
      address,
      blockNumber
    );

    if (rawAccount == null)
      return { nonce: Quantity.Zero, balance: Quantity.Zero };

    const [nonce, balance] = decode<EthereumRawAccount>(rawAccount);
    return {
      nonce: Quantity.from(nonce),
      balance: Quantity.from(balance)
    };
  }

  public async getCode(
    address: Address,
    blockNumber: QUANTITY | Buffer | Tag = Tag.latest
  ): Promise<Data> {
    const { rawAccount, trie } = await this.getRawAccountAndTrie(
      address,
      blockNumber
    );

    if (rawAccount == null) return Data.Empty;

    const [, , , codeHash] = decode<EthereumRawAccount>(rawAccount);
    if (codeHash.equals(KECCAK256_NULL)) return Data.Empty;
    else return trie.db.get(codeHash).then(Data.from);
  }
}
