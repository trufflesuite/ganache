import levelup from "levelup";
import { Data } from "../../../types/json-rpc";
import Blockchain from "../blockchain";

export type Instantiable<T> = {new(...args: any[]): T};

export default class Manager<T> {
    protected blockchain: Blockchain;
    private Type: Instantiable<T>;
    protected base: levelup.LevelUp;
    constructor(blockchain: Blockchain, base: levelup.LevelUp, type: Instantiable<T>){
        this.Type = type;
        this.blockchain = blockchain;
        this.base = base;
    }
    get(key: string | Buffer): Promise<T> {
        if (typeof key === "string") {
            key = Data.from(key).toBuffer();
        }
        return this.base.get(key).then((raw) => new this.Type(raw));
    }
    set(key: Buffer, value: Buffer): Promise<T> {
        return this.base.put(key, value).then((raw) => new this.Type(value));
    }
}