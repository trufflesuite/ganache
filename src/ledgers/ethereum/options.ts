import LedgerOptions from "../../interfaces/ledger-options"
import HexData from "../../types/hex-data";

interface EthereumOptions extends LedgerOptions {
    net_version: string,
    coinbase?: HexData,
    gasPrice?: bigint
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}