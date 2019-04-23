const sub = require("subleveldown");
import levelup from "levelup";
import Database from "../database";
const levelupOptions: any = { valueEncoding: "binary" };

export type Instantiable<T> = {new(...args: any[]): T};

export default class Manager<T> {
    private Type: Instantiable<T>;
    public db: Database;
    protected base: levelup.LevelUp;
    constructor(db: Database, type: Instantiable<T>, name: string){
        this.Type = type;
        this.db = db;
        this.base = sub(db.db, name, levelupOptions);
    }
    get(key: string | Buffer): Promise<T> {
        return this.base.get(key).then((raw) => new this.Type(raw));
    }
    set(key: string | Buffer, value: Buffer): Promise<T> {
        return this.base.put(key, value).then((raw) => new this.Type(raw));
    }
}