import LedgerOptions from "../../interfaces/ledger-options"
import {JsonRpcData} from "../../types/hex-data";

interface EthereumOptions extends LedgerOptions {
    net_version: string,
    coinbase?: JsonRpcData,
    gasPrice?: bigint
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}