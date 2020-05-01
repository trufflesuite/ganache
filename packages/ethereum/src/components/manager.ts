import levelup from "levelup";
import {Data} from "../../../core/src/things/json-rpc";
import Blockchain from "../blockchain";
const NOTFOUND = 404;

export type Instantiable<T> = {new (...args: any[]): T};

export default class Manager<T> {
  protected blockchain: Blockchain;
  #Type: Instantiable<T>;
  protected base: levelup.LevelUp;
  constructor(blockchain: Blockchain, base: levelup.LevelUp, type: Instantiable<T>) {
    this.#Type = type;
    this.blockchain = blockchain;
    this.base = base;
  }
  getRaw(key: string | Buffer): Promise<Buffer> {
    if (typeof key === "string") {
      key = Data.from(key).toBuffer();
    }

    return this.base.get(key).catch(e => {
      if (e.status === NOTFOUND) return null;
      throw e;
    });
  }
  async get(key: string | Buffer) {
    const raw = await this.getRaw(key);
    if (!raw) return null;
    return new this.#Type(raw);
  }
  set(key: Buffer, value: Buffer): Promise<T> {
    return this.base.put(key, value);
  }
}
