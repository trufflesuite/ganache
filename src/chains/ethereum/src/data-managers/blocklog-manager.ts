import BlockLog from "../things/blocklogs";
import { LevelUp } from "levelup";
import Manager from "./manager";
import { Quantity } from "@ganache/utils";

export default class BlockLogManager extends Manager<BlockLog> {
  constructor(base: LevelUp) {
    super(base, BlockLog);
  }

  async get(key: string | Buffer) {
    const log = await super.get(key);
    if (log) {
      log.blockNumber = key instanceof Quantity ? key : Quantity.from(key);
    }
    return log;
  }
}
