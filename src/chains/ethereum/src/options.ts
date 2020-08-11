import {ProviderOptions} from "@ganache/options";

type EthereumOptions = Pick<
  ProviderOptions,
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
  | "time"
  | "blockTime"
  | "callGasLimit"
  | "accounts"
  | "default_balance_ether"
  | "mnemonic"
  | "legacyInstamine"
  | "account_keys_path"
>;

export default EthereumOptions;
