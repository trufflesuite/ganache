import Options from "../../options/provider-options";
import Account from "../../things/account";

type EthereumOptions = Pick<
  Options,
  | "defaultTransactionGasLimit"
  | "chainId"
  | "networkId"
  | "gasPrice"
  | "unlocked_accounts"
  | "allowUnlimitedContractSize"
  | "hardfork"
  | "gasLimit"
  | "db"
  | "db_path"
  | "secure"
> & {
  timestamp: Date;
  accounts: Account[];
};

export default EthereumOptions;
