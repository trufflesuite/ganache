import ILedgerOptions from "../../interfaces/ledger-options"
import Account from "../../types/account";
import { JsonRpcQuantity } from "../../types/json-rpc";

type EthereumOptions = ILedgerOptions & {
    net_version?: string | number,
    gasPrice?: JsonRpcQuantity,
    accounts?: Account[],
    unlocked_accounts?: string[] | number[],
    allowUnlimitedContractSize?: boolean,
    hardfork?: string,
    gasLimit?: JsonRpcQuantity,
    timestamp?: Date,
    db?: object,
    db_path?: string,
    secure?: boolean
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}
