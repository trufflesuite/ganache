import Database from "../database";
import Account from "../../../types/account";
import Address from "../../../types/address";
import Trie from "merkle-patricia-tree/baseTrie";
import { promisify } from "util";

export default class AccountManager {

    private db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    public async get(address: Address, blockTag: string = "latest"): Promise<Account> {
        const block = await this.db.blocks.get(Buffer.from([0]));
        const trieCopy = new Trie(this.db.trie, block.value.header.stateRoot);
        const get = promisify(trieCopy.get.bind(trieCopy, address.toBuffer()));
        const data = await get();
        return new Account(data);
    }
}
