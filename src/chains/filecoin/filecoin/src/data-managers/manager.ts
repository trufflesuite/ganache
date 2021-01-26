import { LevelUp } from "levelup";
import { Data } from "@ganache/utils";
const NOTFOUND = 404;

export type Instantiable<T> = { new (...args: any[]): T };

export default class Manager<T> {
  #Type: Instantiable<T>;
  #options: {};
  protected base: LevelUp;
  constructor(
    base: LevelUp,
    type: Instantiable<T>,
    options?: ConstructorParameters<Instantiable<T>>[1]
  ) {
    this.#Type = type;
    this.#options = options;
    this.base = base;
  }
  getRaw(key: number | string | Buffer): Promise<Buffer> {
    if (typeof key === "string" || typeof key === "number") {
      key = Buffer.from(`${key}`);
    }

    if (key.length === 0) {
      return null;
    }

    return this.base.get(key).catch(e => {
      if (e.status === NOTFOUND) return null;
      throw e;
    }) as Promise<Buffer>;
  }
  async get(key: number | string | Buffer): Promise<T | null> {
    const raw = await this.getRaw(key);
    if (!raw) return null;
    return new this.#Type(JSON.parse(raw.toString()), this.#options);
  }
  set(key: Buffer, value: Buffer): Promise<void> {
    return this.base.put(key, value);
  }
  del(key: Buffer) {
    return this.base.del(key);
  }
}
