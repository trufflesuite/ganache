import Account from "../types/account";
import HexData from "../types/hex-data";
import HexQuantity from "../types/hex-quantity";
import ILedger from "../interfaces/ledger";
import Ethereum from "../ledgers/ethereum/ethereum";
import JSBI from "jsbi";

interface Logger {
  log(message?: any, ...optionalParams: any[]): void;
}

export default interface Options {
  ledger: ILedger,
  /**
   * Array of Accounts. Each object should have a balance key with a hexadecimal
   * value. The key secretKey can also be specified, which represents the 
   * account's private key. If no secretKey, the address is auto-generated with
   * the given balance. If specified, the key is used to determine the account's
   * address.
   */
  accounts: Array<Account>,

  /**
   * Output VM opcodes for debugging. Defaults to `false`
   */
  debug: boolean,

  /**
   * An object, like console, that implements a log() function.
   */
  logger: Logger,

  /**
   * Use a specific HD wallet mnemonic to generate initial addresses.
   */
  mnemonic: string,

  /**
   * Use arbitrary data to generate the HD wallet mnemonic to be used.
   */
  seed: string,

  /**
   * The default account balance, specified in ether. Defaults to `100` ether
   */
  default_balance_ether: JSBI,

  /**
   * Number of accounts to generate at startup. Default to `10`.
   */
  total_accounts: JSBI,

  /**
   * When a string, same as --fork option above. Can also be a Web3 Provider 
   * object, optionally used in conjunction with the fork_block_number
   */
  fork: string | object,

  /**
   * Block number the provider should fork from, when the fork option is 
   * specified. If the fork option is specified as a string including the @ 
   * sign and a block number, the block number in the fork parameter takes 
   * precedence.
   */
  fork_block_number: string | JSBI,

  /**
   * Same as --networkId option above.
   */
  network_id: number,

  /**
   * Date that the first block should start. Use this feature, along with the
   * evm_increaseTime method to test time-dependent code.
   */
  time: Date,

  /**
   * Whether or not accounts are locked by default. Defaults to `false`
   */
  locked: boolean,

  /**
   * Array of addresses or address indexes specifying which accounts should be unlocked.
   */
  unlocked_accounts: Array<HexData|JSBI>,

  /**
   * Specify a path to a directory to save the chain database. If a database 
   * already exists, that chain will be initialized instead of creating a new 
   * one.
   */
  db_path: String,

  /**
   * Specify an alternative database instance, for instance MemDOWN.
   */
  db: Object,

  /**
   * Whether to report runtime errors from EVM code as RPC errors.
   * This is `true` by default to replicate the error reporting behavior of 
   * previous versions of ganache.
   */
  vmErrorsOnRPCResponse: boolean,

  /**
   * The hierarchical deterministic path to use when generating accounts.
   * Default: "m/44'/60'/0'/0/"
   */
  hdPath: string,

  /**
   * Allows unlimited contract sizes while debugging. By setting this to true, the check within the EVM for contract size limit of 24KB (see EIP-170) is bypassed. Setting this to true will cause ganache-core to behave differently than production environments. (default: false; ONLY set to true during debugging).
   */
  allowUnlimitedContractSize: boolean,
  /**
   * Sets the default gas price for transactions if not otherwise specified. 
   * Must be specified as a hex string in wei. Defaults to "0x77359400", or 2 gwei.
   */
  gasPrice: HexQuantity,

  /**
   * Sets the block gas limit. Must be specified as a hex string. Defaults to 
   * "0x6691b7".
   */
  gasLimit: HexQuantity,

  /**
   * 
   */
  verbose: boolean,

  /**
   * 
   */
  asyncRequestProcessing: boolean,
};

export const getDefault: ()=> Options = () => {
  const now = Date.now();
  return {
    ledger: new Ethereum({networkId: now}),
    accounts: null,
    debug: false,
    logger: {log: () => {}},
    mnemonic: null,
    seed: null,
    default_balance_ether: JSBI.BigInt(100),
    total_accounts: JSBI.BigInt(10),
    fork: null,
    fork_block_number: null,
    network_id: now,
    time: null,
    locked: false,
    unlocked_accounts: null,
    db_path: null,
    db: null,
    vmErrorsOnRPCResponse: true,
    hdPath: "m/44'/60'/0'/0/",
    allowUnlimitedContractSize:true,
    gasPrice: new HexQuantity("0x77359400"),
    gasLimit: new HexQuantity("0x6691b7"),
    verbose: false,
    asyncRequestProcessing: false
  } as Options;
}