import Database from "../database";
import Account from "../../../types/account";
import Address from "../../../types/address";

export default class AccountManager {

    private db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    public async get(address: Address, blockTag: string = "latest"): Promise<Account> {
        const block = await this.db.blocks.get(blockTag);
        // this.db.trie.

        // trie.get(utils.toBuffer(address), function(err, data) {
        // // Finally, put the stateRoot back for good
        // trie.root = currentStateRoot;
    
        // var account = new Account(data);
    
        return new Account(address);
    }
}
