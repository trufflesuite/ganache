import ILedger, {optionsSymbol as _options} from "../../interfaces/ledger";
import EthereumOptions, {getDefaultOptions as getDefaultEthereumOptions} from "./options";
import {JsonRpcData, JsonRpcQuantity, IndexableJsonRpcData} from "../../types/json-rpc";
import Blockchain from "./blockchain";
import Tag from "../../types/tags";
import { IndexableAddress } from "../../types/address";
import Transaction from "../../types/transaction";
import Account from "../../types/account";
import Block from "ethereumjs-block";
import { resolve } from "dns";

const createKeccakHash = require("keccak");

const hash = createKeccakHash("keccak256");

const _coinbase = Symbol("coinbase");
const _isMining = Symbol("isMining");
const _blockchain = Symbol("blockchain");

export default class Ethereum implements ILedger {
    readonly [_coinbase]: Account;
    readonly [_options]: EthereumOptions;
    private [_isMining]: boolean = false;
    private readonly [_blockchain]: Blockchain;
    constructor(options: EthereumOptions, ready: ()=>{}) {
        const tmpOptions = Object.assign(getDefaultEthereumOptions(), options);
        this[_coinbase] = tmpOptions.accounts[0];
        this[_options] = tmpOptions;
        const chain = new Blockchain();
        this[_blockchain] = chain;
        chain.on("ready", ready);
    }

    /**
     * Returns the current client version.
     * @returns The current client version.
     */
    async web3_clientVersion(): Promise<string> {
        return "EthereumJS canache-core/v" + 0 + "/ethereum-js";
    };
    
    /**
     * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
     * @param {string} the data to convert into a SHA3 hash.
     * @returns The SHA3 result of the given string.
     */
    async web3_sha3(string: string): Promise<Buffer> {
        return hash(string).digest();
    };

    /**
     * Returns number of peers currently connected to the client.
     * @returns {QUANTITY} integer of the number of connected peers.
     */
    async net_peerCount(): Promise<bigint>{
        return 0n;
    }

    /**
     * Returns the current network id.
     * @returns The current network id.
     */
    async net_version(): Promise<string> {
        return this[_options].net_version;
    }

    /**
     * Returns true if client is actively listening for network connections.
     * @returns true when listening, otherwise false.
     */
    async net_listening(): Promise<boolean> {
        return true;
    }

    /**
     * Returns the current ethereum protocol version.
     * @returns The current ethereum protocol version.
     */
    async eth_protocolVersion(): Promise<string> {
        return "63";
    }


    /**
     * Returns an object with data about the sync status or false.
     * @returns An object with sync status data or false, when not syncing:
     *   startingBlock: {bigint} - The block at which the import started (will only be reset, after the sync reached his head)
     *   currentBlock: {bigint} - The current block, same as eth_blockNumber
     *   highestBlock: {bigint} - The estimated highest block
     */
    async eth_syncing(): Promise<object|boolean> {
        return false;
    }

    /**
     * Returns the client coinbase address.
     * @returns 20 bytes - the current coinbase address.
     */
    async eth_coinbase(): Promise<JsonRpcData> {
        return this[_coinbase] ? this[_coinbase].address : null;
    }

    /**
     * Returns true if client is actively mining new blocks.
     * @returns returns true of the client is mining, otherwise false.
     */
    async eth_mining(): Promise<boolean>{
        return this[_isMining];
    }

    /**
     * Returns the number of hashes per second that the node is mining with.
     * @returns number of hashes per second.
     */
    async eth_hashrate(): Promise<bigint> {
        return 0n;
    }

    /**
     * Returns the current price per gas in wei.
     * @returns integer of the current gas price in wei.
     */
    async eth_gasPrice(): Promise<bigint>{
        return this[_options].gasPrice;
    }

    /**
     * Returns a list of addresses owned by client.
     * @returns Array of 20 Bytes - addresses owned by the client.
     */
    async eth_accounts(): Promise<JsonRpcData[]>{
        return this[_options].accounts;
    }

    /**
     * Returns the number of most recent block.
     * @returns integer of the current block number the client is on.
     */
    async eth_blockNumber(): Promise<bigint> {
        return this[_blockchain].blocks.get(Tag.LATEST).then((block: any) => BigInt(block.value.header.number));
    }

    /**
     * Returns the balance of the account of given address.
     * @param address 20 Bytes - address to check for balance.
     * @param blockNumber integer block number, or the string "latest", "earliest" or "pending", see the default block parameter
     */
    async eth_getBalance(address: IndexableAddress, blockNumber: bigint|Tag = Tag.LATEST): Promise<JsonRpcQuantity> {
        const chain = this[_blockchain];
        const str = blockNumber.toString();
        var t = chain.blocks.get("str");
        const block = await chain.blocks.get(str);
        const account = await block.accounts[address];
        return account.balance;
    }

    /**
     * Returns the information about a transaction requested by transaction hash.
     * 
     * @param transasctionHash 32 Bytes - hash of a transaction
     */
    async eth_getTransactionByHash(transasctionHash: IndexableJsonRpcData): Promise<Transaction> {
        transasctionHash = JsonRpcData.from(transasctionHash);
        
        const chain = this[_blockchain];
        const block = await chain.blocks.get(Tag.LATEST);

        // TODO: just POC stuff i was working on...
        if (!block) {
            const b = new Block(null as any);
            b.header.number = Buffer.from("1234", "hex");
            const c = b.serialize(true);
            const d = new Block(c);
            // await chain.blocks.set(Tag.LATEST, c);
        }
        const block2 = await chain.blocks.get(Tag.LATEST);
        // END


        const transaction = block.transactions[transasctionHash];
        return transaction;
    }

    @sync
    async eth_sendTransaction(transaction: any): Promise<string> {
        // todo: transaction stuff
        return "";
    }

    @sync
    async eth_sendRawTransaction(transaction: any): Promise<string> {
        // todo: transaction stuff
        return "";
    }

    readonly [index: string]: (...args: any) => Promise<{}>;
}

// make sync wrap the method in a FIFO queue
function sync(target: any, name: any, descriptor: any) {
    const method = descriptor.value;
    descriptor.value = function(...args: any[]) {
        return method.apply(args);
    }
}
