/// <reference types="node" />
import { LevelUp } from "levelup";
import { SerializableObject, BaseConfig } from "../things/serializable-object";
export declare type Instantiable<T> = {
  new (...args: any[]): T;
};
export default class Manager<
  T extends SerializableObject<C>,
  C extends BaseConfig
> {
  #private;
  protected base: LevelUp;
  constructor(
    base: LevelUp,
    type: Instantiable<T>,
    options?: ConstructorParameters<Instantiable<T>>[1]
  );
  getRaw(key: number | string | Buffer): Promise<Buffer | null>;
  get(key: number | string | Buffer): Promise<T | null>;
  setRaw(key: number | string | Buffer, value: Buffer): Promise<void>;
  set(key: number | string | Buffer, value: T): Promise<void>;
  del(key: Buffer): Promise<void>;
}
