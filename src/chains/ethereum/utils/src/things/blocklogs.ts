import { Data, Quantity } from "@ganache/utils";
import { BUFFER_ZERO, RPCQUANTITY_ONE } from "@ganache/utils";
import { decode, encode } from "@ganache/rlp";
import { Address } from "@ganache/ethereum-address";

export type TransactionLog = [
  address: Buffer,
  topics: Buffer[],
  data: Buffer | Buffer[]
];

export type BlockLog = [
  removed: Buffer,
  transactionIndex: Buffer,
  transactionHash: Buffer,
  address: TransactionLog[0],
  topics: TransactionLog[1],
  data: TransactionLog[2]
];

const _raw = Symbol("raw");
const _logs = Symbol("logs");

const filterByTopic = (
  expectedTopics: (string | string[])[],
  logTopics: Buffer[]
) => {
  // Exclude log if its number of topics is less than the number expected
  if (expectedTopics.length > logTopics.length) return false;

  // for every expectedTopic, we must much the log topic in the same position
  return expectedTopics.every((expectedTopic, logPosition) => {
    // a `null` topic means "anything"
    if (expectedTopic === null) return true;

    let expectedTopicSet: string[];
    if (!Array.isArray(expectedTopic)) {
      return logTopics[logPosition].equals(Data.from(expectedTopic).toBuffer());
    }
    // an empty rule set means "anything"
    if (expectedTopic.length === 0) return true;
    expectedTopicSet = expectedTopic;

    const logTopic = logTopics[logPosition];
    // "OR" logic, e.g., [[A, B]] means log topic in the first position matching either "A" OR "B":
    return expectedTopicSet.some(expectedTopic =>
      logTopic.equals(Data.from(expectedTopic).toBuffer())
    );
  });
};

export class BlockLogs {
  [_raw]: [blockHash: Buffer, blockLog: BlockLog[]];

  constructor(data: Buffer) {
    if (data) {
      const decoded = (decode(data) as unknown) as [Buffer, BlockLog[]];
      this[_raw] = decoded;
    }
  }

  /**
   *
   * @param blockHash Creates an BlogLogs entity with an empty internal logs
   * array.
   */
  static create(blockHash: Data) {
    const blockLog = Object.create(BlockLogs.prototype) as BlockLogs;
    blockLog[_raw] = [blockHash.toBuffer(), []];
    return blockLog;
  }

  /**
   * rlpEncode's the blockHash and logs array for db storage
   */
  public serialize() {
    return encode(this[_raw]);
  }

  /**
   * Appends the data to the internal logs array
   * @param transactionIndex
   * @param transactionHash
   * @param log
   */
  public append(
    /*removed: boolean, */ transactionIndex: Quantity,
    transactionHash: Data,
    log: TransactionLog
  ) {
    this[_raw][1].push([
      BUFFER_ZERO, // `removed`, TODO: this is used for reorgs, but we don't support them yet
      transactionIndex.toBuffer(), // transactionIndex
      transactionHash.toBuffer(), // transactionHash
      log[0], // `address`
      log[1], // `topics`
      log[2] // `data`
    ]);
  }

  /**
   * Returns the number of logs in the internal logs array.
   */
  get length() {
    return this[_raw][1].length;
  }

  public blockNumber: Quantity;

  static fromJSON(json: any[] | null) {
    if (!json || json.length === 0) {
      return null;
    }

    const blockHash: string = json[0].blockHash;
    const blockNumber: string = json[0].blockNumber;
    const blockLogs = BlockLogs.create(Data.from(blockHash, 32));
    blockLogs.blockNumber = Quantity.from(blockNumber);
    json.forEach(log => {
      const address = Address.from(log.address);
      const blockNumber = log.blockNumber;
      const data = Array.isArray(log.data)
        ? log.data.map(d => Data.from(d).toBuffer())
        : Data.from(log.data).toBuffer();
      const logIndex = log.logIndex;
      const removed =
        log.removed === false ? BUFFER_ZERO : RPCQUANTITY_ONE.toBuffer();
      const topics = Array.isArray(log.topics)
        ? log.topics.map(t => Data.from(t, 32).toBuffer())
        : Data.from(log.topics, 32).toBuffer();
      const transactionHash = Data.from(log.transactionHash, 32);
      const transactionIndex = Quantity.from(log.transactionIndex);
      blockLogs.append(transactionIndex, transactionHash, [
        address.toBuffer(), // `address`
        topics,
        data
      ]);
    });
    return blockLogs;
  }

  toJSON() {
    return this[_logs]().toJSON();
  }

  [_logs]() {
    const blockNumber = this.blockNumber;
    const raw = this[_raw];
    const logs = raw[1];
    const l = this.length;
    const blockHash = Data.from(raw[0]);
    return {
      toJSON() {
        return {
          *[Symbol.iterator]() {
            for (let i = 0; i < l; i++) {
              yield BlockLogs.logToJSON(
                logs[i],
                Quantity.from(i),
                blockHash,
                blockNumber
              );
            }
          }
        };
      },
      *[Symbol.iterator]() {
        for (let i = 0; i < l; i++) {
          const log = logs[i];
          const address = log[3];
          const topics = log[4];
          yield {
            address,
            topics,
            toJSON: () =>
              BlockLogs.logToJSON(log, Quantity.from(i), blockHash, blockNumber)
          };
        }
      }
    };
  }

  /**
   *
   * @param log
   * @param logIndex The index this log appears in the block
   * @param blockHash The hash of the block
   * @param blockNumber The block number
   */
  protected static logToJSON(
    log: BlockLog,
    logIndex: Quantity,
    blockHash: Data,
    blockNumber: Quantity
  ) {
    const topics = log[4];
    const data = log[5];

    return {
      address: Address.from(log[3]),
      blockHash,
      blockNumber,
      data: Array.isArray(data)
        ? data.map(d => Data.from(d, d.length))
        : Data.from(data, data.length),
      logIndex, // this is the index in the *block*
      removed: log[0].equals(BUFFER_ZERO) ? false : true,
      topics: Array.isArray(topics)
        ? topics.map(t => Data.from(t, 32))
        : Data.from(topics, 32),
      transactionHash: Data.from(log[2], 32),
      transactionIndex: Quantity.from(log[1])
    };
  }

  /**
   * Note: you must set `this.blockNumber: Quantity` first!
   *
   * Topics are order-dependent. A transaction with a log with topics [A, B] will be matched by the following topic
   * filters:
   *  ▸ [] "anything"
   *  ▸ [A] "A in first position (and anything after)"
   *  ▸ [null, B] "anything in first position AND B in second position (and anything after)"
   *  ▸ [A, B] "A" in first position AND B in second position (and anything after)"
   *  ▸ [[A, B], [A, B]] "(A OR B) in first position AND (A OR B) in second position (and anything after)"
   * @param expectedAddresses
   * @param expectedTopics
   * @returns JSON representation of the filtered logs
   */
  *filter(expectedAddresses: Buffer[], expectedTopics: (string | string[])[]) {
    const logs = this[_logs]();
    if (expectedAddresses.length !== 0) {
      if (expectedTopics.length === 0) {
        for (const log of logs) {
          if (expectedAddresses.some(address => address.equals(log.address)))
            yield log.toJSON();
        }
      } else {
        for (const log of logs) {
          if (!expectedAddresses.some(address => address.equals(log.address)))
            continue;
          if (filterByTopic(expectedTopics, log.topics)) yield log.toJSON();
        }
      }
    } else if (expectedTopics.length !== 0) {
      for (const log of logs) {
        if (filterByTopic(expectedTopics, log.topics)) yield log.toJSON();
      }
    } else {
      yield* logs.toJSON();
    }
  }
}
