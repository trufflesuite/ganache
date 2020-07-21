import {LevelUp} from "levelup";
import {Data} from "@ganache/utils/src/things/json-rpc";
import Blockchain from "../blockchain";
import Tag from "../things/tags";
const NOTFOUND = 404;

export type Instantiable<T> = {new (...args: any[]): T};

export default class Manager<T> {
  protected blockchain: Blockchain;
  #Type: Instantiable<T>;
  protected base: LevelUp;
  constructor(blockchain: Blockchain, base: LevelUp, type: Instantiable<T>) {
    this.#Type = type;
    this.blockchain = blockchain;
    this.base = base;
  }
  getRaw(key: string | Buffer | Tag): Promise<Buffer> {
    if (typeof key === "string") {
      key = Data.from(key).toBuffer();
    }

    return this.base.get(key).catch(e => {
      if (e.status === NOTFOUND) return null;
      throw e;
    }) as Promise<Buffer>;
  }
  async get(key: string | Buffer) {
    const raw = await this.getRaw(key);
    if (!raw) return null;
    return new this.#Type(raw);
  }
  set(key: Buffer, value: Buffer): Promise<void> {
    return this.base.put(key, value);
  }
  del(key: Buffer) {
    return this.base.del(key);
  }
}
