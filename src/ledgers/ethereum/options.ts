import LedgerOptions from "../../interfaces/ledger-options"

interface EthereumOptions extends LedgerOptions {
    net_version: string
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}