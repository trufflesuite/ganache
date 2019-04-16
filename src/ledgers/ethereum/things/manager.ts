const sub = require("subleveldown");
import levelup from "levelup";
import Database from "../database";
const levelupOptions: any = { valueEncoding: "binary" };

export type Executor<T> = (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

export type Instantiable<T> = {new(...args: any[]): T};

export default class Manager<T>{
    private Type: Instantiable<T>;
    public db: Database;
    private base: levelup.LevelUp;
    constructor(db: Database, type: Instantiable<T>){
        this.Type = type;
        this.db = db;
        this.base = sub(db, "blocks", levelupOptions);
    }
    get(key: string): T {
        return new this.Type(this.base.get(key));
    }
    set(key: string, value: Buffer): T {
        return new this.Type(this.base.put(key, value));
    }
}