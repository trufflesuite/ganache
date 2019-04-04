import LedgerOptions from "../../interfaces/ledger-options"
import {JsonRpcData} from "../../types/json-rpc";

interface EthereumOptions extends LedgerOptions {
    net_version: string,
    gasPrice?: bigint,
    accounts: any[]
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}