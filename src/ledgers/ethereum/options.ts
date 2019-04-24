import ILedgerOptions from "../../interfaces/ledger-options"
import Account from "../../types/account";
import { JsonRpcQuantity } from "../../types/json-rpc";

type EthereumOptions = ILedgerOptions & {
    net_version: string,
    gasPrice?: bigint,
    accounts: Account[],
    unlockedAccounts: string[] | number[],
    allowUnlimitedContractSize: boolean,
    hardfork: string,
    gasLimit: JsonRpcQuantity,
    timestamp?: Date,
    db?: object,
    dbPath?: string,
    secure: boolean
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}