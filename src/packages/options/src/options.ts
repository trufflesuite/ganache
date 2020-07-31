import {Quantity} from "@ganache/utils";
import {types} from "@ganache/utils";

interface Logger {
  log(message?: any, ...optionalParams: any[]): void;
}

// Okay, so a "bug" in TS treats types with the same shape as having the same
// name, so Intellisense would say that AccountType requires `[Address, Address]`
// instead of `[Address, PrivateKey]`, flip flopping like this "fixes" it.
type Account = {balance: string; secretKey?: string};

export interface Options {
  api?: types.Api;
  /**
   * Array of Accounts. Each object should have a balance key with a hexadecimal
   * value. The key secretKey can also be specified, which represents the
   * account's private key. If no secretKey, the address is auto-generated with
   * the given balance. If specified, the key is used to determine the account's
   * address.
   */
  accounts?: Account[];

  /**
   * Output VM opcodes for debugging. Defaults to `false`
   */
  debug?: boolean;

  /**
   * Specify blockTime in seconds for automatic mining. If you don't specify
   * this flag, ganache will instantly mine a new block for every transaction.
   * Using the blockTime option is discouraged unless you have tests which 
   * require a specific mining interval.
   */
  blockTime?: number;

  /**
   * An object, like console, that implements a log() function.
   */
  logger?: Logger;

  /**
   * Use a specific HD wallet mnemonic to generate initial addresses.
   */
  mnemonic?: string;

  /**
   * Use arbitrary data to generate the HD wallet mnemonic to be used.
   */
  seed?: string;

  /**
   * The default account balance, specified in ether. Defaults to `100` ether
   */
  default_balance_ether?: bigint;

  /**
   * Number of accounts to generate at startup. Default to `10`.
   */
  total_accounts?: number;

  /**
   * When a string, same as --fork option above. Can also be a Web3 Provider
   * object, optionally used in conjunction with the fork_block_number
   */
  fork?: string | object;

  /**
   * Block number the provider should fork from, when the fork option is
   * specified. If the fork option is specified as a string including the @
   * sign and a block number, the block number in the fork parameter takes
   * precedence.
   */
  fork_block_number?: string | bigint;

  /**
   * The currently configured chain id, a value used in replay-protected
   * transaction signing as introduced by EIP-155. Default's to `1337`
   */
  chainId?: number;

  /**
   * Alias of `networkId`.
   */
  netVersion?: string | number;

  /**
   * Alias of `networkId`.
   */
  net_version?: string | number;

  /**
   * The id of the network returned by the RPC method `net_version`.
   * Defaults to the current timestamp (`Date.now()`).
   */
  networkId?: number;

  /**
   * Alias of `networkId`.
   */
  network_id?: string | number;

  /**
   * Date that the first block should start. Use this feature, along with the
   * `evm_increaseTime` RPC, to test time-dependent code.
   */
  time?: Date;

  /**
   * Alias of `secure`
   */
  locked?: boolean;

  /**
   * Lock available accounts by default (good for third party transaction signing). Defaults to `false`.
   */
  secure?: boolean;

  /**
   * Array of addresses or address indexes specifying which accounts should be unlocked. Alias of unlockedAccounts
   */
  unlocked_accounts?: Array<string | number>;

  /**
   * Specify a path to a directory to save the chain database. If a database
   * already exists, that chain will be initialized instead of creating a new
   * one.
   */
  db_path?: string;

  /**
   * Specify an alternative database instance, for instance MemDOWN.
   */
  db?: object;

  /**
   * Whether to report runtime errors from EVM code as RPC errors.
   * This is `true` by default to replicate the error reporting behavior of
   * previous versions of ganache.
   */
  vmErrorsOnRPCResponse?: boolean;

  /**
   * The hierarchical deterministic path to use when generating accounts.
   * Default: "m/44'/60'/0'/0/"
   */
  hdPath?: string;

  /**
   * Allows unlimited contract sizes while debugging. By setting this to true, the check within the EVM for contract size limit of 24KB (see EIP-170) is bypassed. Setting this to true will cause ganache-core to behave differently than production environments. (default: false; ONLY set to true during debugging).
   */
  allowUnlimitedContractSize?: boolean;
  /**
   * Sets the default gas price for transactions if not otherwise specified.
   * Must be specified as a hex string in wei. Defaults to "0x77359400", or 2 gwei.
   */
  gasPrice?: Quantity;

  /**
   * Sets the block gas limit. Must be specified as a hex string. Defaults to
   * "0x6691b7".
   */
  gasLimit?: Quantity;

  defaultTransactionGasLimit?: Quantity;

  /**
   * Sets the transaction gas limit for `eth_call` and `eth_estimateGas` calls. Must be specified as a `hex` string. Defaults to `"0x1fffffffffffff"` (`Number.MAX_SAFE_INTEGER`)
   */
  callGasLimit?: Quantity

  /**
   *
   */
  verbose?: boolean;

  /**
   *
   */
  asyncRequestProcessing?: boolean;

  hardfork?: "constantinople" | "byzantium" | "petersburg" | "istanbul" | "muirGlacier";
};

const getDefault: (options?: Options) => Options = options => {
  const networkId = (options
    ? options.networkId || options.netVersion || options.network_id || options.net_version || Date.now()
    : Date.now()
  ).toString();
  const chainId = options ? options.chainId || 1337 : 1337;
  const secure = options ? options.secure || options.locked || false : false;
  return Object.assign(
    {
      chainId,
      debug: false,
      logger: {log: () => {}},
      default_balance_ether: 100n,
      total_accounts: 10n,
      networkId,
      vmErrorsOnRPCResponse: true,
      hdPath: "m/44'/60'/0'/0/",
      allowUnlimitedContractSize: false,
      gasPrice: new Quantity(2000000000),
      gasLimit: new Quantity(6721975),
      defaultTransactionGasLimit: new Quantity(90000),
      callGasLimit: new Quantity(Number.MAX_SAFE_INTEGER),
      verbose: false,
      asyncRequestProcessing: true,
      hardfork: "muirGlacier",
      secure
    },
    options
  );
}

export const Options = {
  getDefault
};
