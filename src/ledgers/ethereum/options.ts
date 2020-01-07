import Options from "../../options/provider-options";
import Account from "../../types/account";

type EthereumOptions = Pick<Options, "net_version" | "gasPrice" | "unlocked_accounts" | "allowUnlimitedContractSize" | "hardfork" | "gasLimit" | "db" | "db_path" | "secure"> & {
  timestamp: Date,
  accounts: Account[]
};

export default EthereumOptions;
