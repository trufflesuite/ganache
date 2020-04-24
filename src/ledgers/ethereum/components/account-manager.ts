import Account from "../../../types/account";
import Address from "../../../types/address";
import Trie from "merkle-patricia-tree/baseTrie";
import Blockchain from "../blockchain";
import Tag from "../../../types/tags";
import { LevelUp } from "levelup";

export default class AccountManager {
    #blockchain: Blockchain;
    #trie: LevelUp;
    constructor(blockchain: Blockchain, trie: LevelUp) {
        this.#blockchain = blockchain;
        this.#trie = trie;
    }

    public async get(address: Address, blockNumber: Buffer | Tag = Tag.LATEST): Promise<Account> {
        const blockchain = this.#blockchain;
        const block = await blockchain.blocks.get(blockNumber);
        const trieCopy = new Trie(this.#trie, block.value.header.stateRoot);
        return new Promise((resolve, reject) => {
            trieCopy.get(address.toBuffer(), (err, data)=>{
                if(err) return reject(err);
                resolve(new Account(data));
            });
        });
    }
}
