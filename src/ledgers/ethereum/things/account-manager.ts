import Database from "../database";
import Account from "../../../types/account";
import Address from "../../../types/address";
import Trie from "merkle-patricia-tree/baseTrie";
import { promisify } from "util";
import Blockchain from "../blockchain";

export default class AccountManager {

    private blockchain: Blockchain;
    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
    }

    public async get(address: Address, blockTag: string = "latest"): Promise<Account> {
        const blockchain = this.blockchain;
        const block = await blockchain.blocks.get(Buffer.from([0]));
        const trieCopy = new Trie((blockchain as any).database.trie, block.value.header.stateRoot);
        return new Promise((resolve, reject) => {
            trieCopy.get(address.toBuffer(), (err, data)=>{
                if(err) return reject(err);
                resolve(new Account(data));
            });
        });
    }
}
