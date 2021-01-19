import { BlockLogs } from "@ganache/ethereum-utils";
import { LevelUp } from "levelup";
import Manager from "./manager";
import { Quantity } from "@ganache/utils";

export default class BlockLogManager extends Manager<BlockLogs> {
  constructor(base: LevelUp) {
    super(base, BlockLogs);
  }

  async get(key: string | Buffer) {
    const log = await super.get(key);
    if (log) {
      log.blockNumber = key instanceof Quantity ? key : Quantity.from(key);
    }
    return log;
  }
}
