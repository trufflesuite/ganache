import Account from "../things/account";
import Address from "../things/address";
import Trie from "merkle-patricia-tree/baseTrie";
import Blockchain from "../blockchain";
import Tag from "../things/tags";
import { LevelUp } from "levelup";
import { rlp } from "ethereumjs-util";
import { utils, Quantity } from "@ganache/utils";

const RPCQUANTITY_ZERO = utils.RPCQUANTITY_ZERO;

export default class AccountManager {
  #blockchain: Blockchain;
  #trie: LevelUp;
  constructor(blockchain: Blockchain, trie: LevelUp) {
    this.#blockchain = blockchain;
    this.#trie = trie;
  }

  public async getRaw(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Buffer> {
    const blockchain = this.#blockchain;
    const block = await blockchain.blocks.get(blockNumber);
    const trieCopy = new Trie(this.#trie, block.header.stateRoot.toBuffer());
    return new Promise((resolve, reject) => {
      trieCopy.get(address.toBuffer(), (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  public async getNonce(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    return this.getRaw(address, blockNumber).then(data => {
      if (data) {
        const [nonce] = (rlp.decode(data) as any) as Buffer[];
        return nonce.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(nonce);
      } else {
        return RPCQUANTITY_ZERO;
      }
    });
  }

  public async getBalance(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Quantity> {
    return this.getRaw(address, blockNumber).then(data => {
      if (data) {
        const [, balance] = (rlp.decode(data) as any) as Buffer[];
        return balance.length === 0 ? RPCQUANTITY_ZERO : Quantity.from(balance);
      } else {
        return RPCQUANTITY_ZERO;
      }
    });
  }

  public async get(
    address: Address,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Account> {
    return this.getRaw(address, blockNumber).then(data => {
      return Account.fromBuffer(data);
    });
  }
}
