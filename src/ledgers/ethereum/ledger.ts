const createKeccakHash = require("keccak");
import ILedger, {optionsSymbol} from "../../interfaces/ledger";
import EthereumOptions, {getDefaultOptions as getDefaultEthereumOptions} from "./options"
const hash = createKeccakHash("keccak256");
import JSBI from "jsbi";

export default class Ethereum implements ILedger {
    readonly [optionsSymbol]: EthereumOptions;
    constructor(options: EthereumOptions){
        this[optionsSymbol] = Object.assign(getDefaultEthereumOptions(), options);
    }

    async net_version(): Promise<string> {
        return this[optionsSymbol].net_version;
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

    readonly [index: string]: (...args: any) => Promise<{}>;
}