import Manager from "./manager";
import { Tag, QUANTITY } from "@ganache/ethereum-utils";
import { Quantity, Data, BUFFER_ZERO } from "@ganache/utils";
import type { Common } from "@ethereumjs/common";
import Blockchain from "../blockchain";
import {
  Block,
  BlockRawTransaction,
  EthereumRawBlock,
  EthereumRawBlockHeader,
  GanacheRawBlock,
  Head,
  serialize,
  WithdrawalRaw
} from "@ganache/ethereum-block";
import { Address } from "@ganache/ethereum-address";
import {
  encodeWithPrefix,
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  TransactionFactory
} from "@ganache/ethereum-transaction";
import { GanacheLevelUp } from "../database";
import { Ethereum } from "../api-types";
import { decode, encode } from "@ganache/rlp";

const LATEST_INDEX_KEY = BUFFER_ZERO;

const NOTFOUND = 404;

const EMPTY_BUFFER = Buffer.from([]);

export default class BlockManager extends Manager<Block> {
  /**
   * The earliest block
   */
  public earliest: Block;

  /**
   * The latest block
   */
  public latest: Block;

  /**
   * The next block
   */
  public pending: Block;

  #blockchain: Blockchain;
  #common: Common;
  #blockIndexes: GanacheLevelUp;

  static async initialize(
    blockchain: Blockchain,
    common: Common,
    blockIndexes: GanacheLevelUp,
    base: GanacheLevelUp
  ) {
    const bm = new BlockManager(blockchain, common, blockIndexes, base);
    await bm.updateTaggedBlocks();
    return bm;
  }

  constructor(
    blockchain: Blockchain,
    common: Common,
    blockIndexes: GanacheLevelUp,
    base: GanacheLevelUp
  ) {
    super(base, Block, common);

    this.#blockchain = blockchain;
    this.#common = common;
    this.#blockIndexes = blockIndexes;
  }

  static rawFromJSON(json: any, common: Common) {
    const blockNumber = Quantity.toBuffer(json.number);
    const hasWithdrawals = json.withdrawalsRoot != null;
    const header: EthereumRawBlockHeader = [
      Data.toBuffer(json.parentHash),
      Data.toBuffer(json.sha3Uncles),
      Address.from(json.miner).toBuffer(),
      Data.toBuffer(json.stateRoot),
      Data.toBuffer(json.transactionsRoot),
      Data.toBuffer(json.receiptsRoot),
      Data.toBuffer(json.logsBloom),
      Quantity.toBuffer(json.difficulty),
      blockNumber,
      Quantity.toBuffer(json.gasLimit),
      Quantity.toBuffer(json.gasUsed),
      Quantity.toBuffer(json.timestamp),
      Data.toBuffer(json.extraData),
      Data.toBuffer(json.mixHash),
      Data.toBuffer(json.nonce)
    ];
    // We can't include the _slots_ for these values in the `header` array
    // (i.e., set them to `undefined`), when the values are `undefined`, as the
    // `length` of the array is encoded by the rlp process.
    if (json.baseFeePerGas) {
      header[15] = Quantity.toBuffer(json.baseFeePerGas);
      if (hasWithdrawals) {
        header[16] = Data.toBuffer(json.withdrawalsRoot);
      }
    }
    const totalDifficulty = Quantity.toBuffer(json.totalDifficulty);
    const txs: BlockRawTransaction[] = Array(json.transactions.length);
    const extraTxs: GanacheRawBlockTransactionMetaData[] = Array(
      json.transactions.length
    );
    const blockHash = Data.toBuffer(json.hash);
    for (let index = 0; index < json.transactions.length; index++) {
      const txJson = json.transactions[index];
      const blockExtra: GanacheRawBlockTransactionMetaData = [
        Address.toBuffer(txJson.from),
        Quantity.toBuffer(txJson.hash)
      ];
      const txExtra: GanacheRawExtraTx = [
        ...blockExtra,
        blockHash,
        blockNumber,
        Quantity.toBuffer(index)
      ];
      const tx = TransactionFactory.fromRpc(txJson, common, txExtra);
      txs[index] =
        tx.raw.length === 9
          ? tx.raw
          : tx.serialized ?? encodeWithPrefix(tx.type.toNumber(), tx.raw);
      extraTxs[index] = blockExtra;
    }

    let start: EthereumRawBlock;

    if (hasWithdrawals) {
      const extraWithdrawals: WithdrawalRaw[] = Array(json.withdrawals.length);
      for (let i = 0; i < json.withdrawals.length; i++) {
        const withdrawal = json.withdrawals[i];
        extraWithdrawals[i] = [
          Quantity.toBuffer(withdrawal.index),
          Quantity.toBuffer(withdrawal.validatorIndex),
          Address.toBuffer(withdrawal.address),
          Quantity.toBuffer(withdrawal.amount)
        ];
      }
      start = [header, txs, [], extraWithdrawals];
    } else {
      start = [header, txs, []];
    }

    return serialize(start, [totalDifficulty, extraTxs]).serialized;
  }

  fromFallback = async (
    tagOrBlockNumber: string | Quantity
  ): Promise<Buffer> => {
    const fallback = this.#blockchain.fallback;
    let blockNumber: string;
    if (typeof tagOrBlockNumber === "string") {
      blockNumber = tagOrBlockNumber;
    } else if (!fallback.isValidForkBlockNumber(tagOrBlockNumber)) {
      // don't get the block if the requested block is _after_ our fallback's
      // blocknumber because it doesn't exist in our local chain.
      return null;
    } else {
      blockNumber = tagOrBlockNumber.toString();
    }

    const json = await fallback.request<any>("eth_getBlockByNumber", [
      blockNumber,
      true
    ]);
    if (json == null) {
      return null;
    } else {
      const common = fallback.getCommonForBlock(this.#common, {
        number: BigInt(json.number),
        timestamp: BigInt(json.timestamp)
      });

      return BlockManager.rawFromJSON(json, common);
    }
  };

  getBlockByTag(tag: Tag) {
    switch (tag) {
      case "latest":
      case "finalized":
      case "safe":
        return this.latest;
      case "pending":
        // TODO: build a real pending block!
        return this.latest; // this.createBlock(this.latest.header);
      case "earliest":
        return this.earliest;
      default:
        // the key is probably a hex string, let nature takes its course.
        break;
    }
  }

  getEffectiveNumber(
    tagOrBlockNumber: QUANTITY | Buffer | Tag = typeof Tag.latest
  ): Quantity {
    if (typeof tagOrBlockNumber === "string") {
      const block = this.getBlockByTag(tagOrBlockNumber as Tag);
      if (block) {
        return block.header.number;
      }
    }
    return Quantity.from(tagOrBlockNumber);
  }

  async getNumberFromHash(hash: string | Buffer | Tag) {
    return this.#blockIndexes.get(Data.toBuffer(hash)).catch(e => {
      if (e.status === NOTFOUND) return null;
      throw e;
    }) as Promise<Buffer | null>;
  }

  async getByHash(hash: string | Buffer | Tag) {
    const number = await this.getNumberFromHash(hash);
    if (number === null) {
      const fallback = this.#blockchain.fallback;
      if (fallback) {
        const json = await fallback.request<any>("eth_getBlockByHash", [
          Data.from(hash),
          true
        ]);
        if (json) {
          const number = BigInt(json.number);
          if (number <= fallback.blockNumber.toBigInt()) {
            const common = fallback.getCommonForBlock(this.#common, {
              number,
              timestamp: BigInt(json.timestamp)
            });
            return new Block(BlockManager.rawFromJSON(json, common), common);
          }
        }
      }

      return null;
    } else {
      return this.get(number);
    }
  }

  async getRawByBlockNumber(blockNumber: Quantity): Promise<Buffer> {
    // TODO(perf): make the block's raw fields accessible on latest/earliest/pending so
    // we don't have to fetch them from the db each time a block tag is used.
    // Issue: https://github.com/trufflesuite/ganache/issues/3481
    const fallback = this.#blockchain.fallback;
    const numBuf = blockNumber.toBuffer();
    return this.getRaw(numBuf).then(block => {
      if (block == null && fallback) {
        return this.fromFallback(blockNumber);
      }
      return block;
    });
  }

  async get(tagOrBlockNumber: QUANTITY | Buffer | Tag) {
    if (typeof tagOrBlockNumber === "string") {
      const block = this.getBlockByTag(tagOrBlockNumber as Tag);
      if (block) return block;
    }

    const blockNumber = Quantity.from(tagOrBlockNumber);
    const block = await this.getRaw(blockNumber.toBuffer());
    const common = this.#common;
    if (block) return new Block(block, common);
    else {
      const fallback = this.#blockchain.fallback;
      if (fallback) {
        const block = await this.fromFallback(blockNumber);
        if (block) {
          const header: EthereumRawBlockHeader =
            decode<GanacheRawBlock>(block)[0];
          return new Block(
            block,
            fallback.getCommonForBlock(common, {
              number: blockNumber.toBigInt(),
              timestamp: Quantity.toBigInt(header[11])
            })
          );
        }
      }
    }

    throw new Error("header not found");
  }

  /**
   * Writes the block object to the underlying database.
   * @param block -
   */
  async putBlock(number: Buffer, hash: Data, serialized: Buffer) {
    let key = number;
    // ensure we can store Block #0 as key "00", not ""
    if (EMPTY_BUFFER.equals(key)) {
      key = Buffer.from([0]);
    }
    const secondaryKey = hash.toBuffer();
    await Promise.all([
      this.#blockIndexes.put(secondaryKey, key),
      super.set(key, serialized)
    ]);
  }

  /**
   * Updates the "latest" index to point to the given number.
   * @param number the block number of the latest block
   */
  async updateLatestIndex(number: Buffer) {
    await this.#blockIndexes.put(LATEST_INDEX_KEY, number);
  }

  async getEarliest() {
    const fallback = this.#blockchain.fallback;
    if (fallback) {
      const json = await fallback.request<Ethereum.Block<true, "public">>(
        "eth_getBlockByNumber",
        [Tag.earliest, true],
        // TODO: re-enable cache once this is fixed
        // https://github.com/trufflesuite/ganache/issues/3773
        { disableCache: true }
      );
      if (json) {
        const common = fallback.getCommonForBlock(this.#common, {
          number: BigInt(json.number),
          timestamp: BigInt(json.timestamp)
        });
        return new Block(BlockManager.rawFromJSON(json, common), common);
      }
    } else {
      // if we're forking, there shouldn't be an earliest block saved to the db,
      // it's always retrieved from the fork
      for await (const data of this.base.createValueStream({ limit: 1 })) {
        return new Block(data as Buffer, this.#common);
      }
    }
  }

  /**
   * Updates the this.latest and this.earliest properties with data
   * from the database.
   */
  async updateTaggedBlocks() {
    const [earliest, latestBlockNumber] = await Promise.all([
      this.getEarliest(),
      this.#blockIndexes.get(LATEST_INDEX_KEY).catch(e => null)
    ]);

    if (earliest) this.earliest = earliest;

    if (latestBlockNumber) {
      this.latest = await this.get(latestBlockNumber);
    } else {
      // TODO: remove this section for the Ganache 8.0 release
      // Ganache v7.0.0 didn't save a pointer to the latest block correctly, so
      // when a database was restarted it would pull the wrong block. This code
      // iterates over all data in the data base and finds the block with the
      // highest block number and updates the database with the pointer so we
      // don't have to hit this code again next time.
      this.latest = await (async () => {
        let latest: Block;
        for await (const data of this.base.createValueStream()) {
          const block = new Block(data as Buffer, this.#common);
          if (
            !latest ||
            block.header.number.toBigInt() > latest.header.number.toBigInt()
          ) {
            latest = block;
          }
        }
        return latest;
      })();
      if (this.latest) {
        // update the LATEST_INDEX_KEY index so we don't have to do this next time
        await this.#blockIndexes
          .put(LATEST_INDEX_KEY, this.latest.header.number.toBuffer())
          .catch(e => null);
      }
    }
  }
}
