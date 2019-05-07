import ILedgerOptions from "../../interfaces/ledger-options"
import Account from "../../types/account";
import { Quantity } from "../../types/json-rpc";

type EthereumOptions = ILedgerOptions & {
    net_version?: string | number,
    gasPrice?: Quantity,
    accounts?: Account[],
    unlocked_accounts?: string[] | number[],
    allowUnlimitedContractSize?: boolean,
    hardfork?: string,
    gasLimit?: Quantity,
    timestamp?: Date,
    db?: object,
    db_path?: string,
    secure?: boolean
}

export default EthereumOptions;
export const getDefaultOptions : () => EthereumOptions = () => {
    return {} as EthereumOptions;
}
