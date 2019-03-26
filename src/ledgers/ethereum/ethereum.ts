const createKeccakHash = require("keccak");
import ILedger from "../../interfaces/ledger";
const hash = createKeccakHash("keccak256");
import JSBI from "jsbi";

export default class Ethereum implements ILedger{
    readonly [index: string]: (...args: any) => Promise<{}>;

    options: any;
    private _netVersion: any;
    constructor(options: any){
        this.options = options;
        this._netVersion = (this.options.networkId || Date.now()).toString();
    }

    async net_version(): Promise<string> {
        return this._netVersion;
    }

    async net_listening(): Promise<Boolean> {
        return true;
    }
      
    async net_peerCount(): Promise<JSBI> {
        return JSBI.BigInt(0);
    }

    async web3_clientVersion(): Promise<string> {
        return "EthereumJS canache-core/v" + 0 + "/ethereum-js";
    };
    
    async web3_sha3(string: string): Promise<Buffer> {
        return hash(string).digest();
    };
}