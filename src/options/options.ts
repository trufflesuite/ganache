import Account from "../types/account";
import HexData from "../types/hex-data";
import HexQuantity from "../types/hex-quantity";

interface Logger {
  log(...args: any[]): void;
}

export default class Options {
  /**
   * Array of Accounts. Each object should have a balance key with a hexadecimal
   * value. The key secretKey can also be specified, which represents the 
   * account's private key. If no secretKey, the address is auto-generated with
   * the given balance. If specified, the key is used to determine the account's
   * address.
   */
  public accounts: Array<Account> = null

  /**
   * Output VM opcodes for debugging. Defaults to `false`
   */
  public debug: boolean = false

  /**
   * An object, like console, that implements a log() function.
   */
  public logger: {log: Logger} = null

  /**
   * Use a specific HD wallet mnemonic to generate initial addresses.
   */
  public mnemonic: string = null

  /**
   * Use arbitrary data to generate the HD wallet mnemonic to be used.
   */
  public seed: string = null

  /**
   * The default account balance, specified in ether. Defaults to `100` ether
   */
  public default_balance_ether: number = 100

  /**
   * Number of accounts to generate at startup. Default to `10`.
   */
  public total_accounts: number = 10

  /**
   * When a string, same as --fork option above. Can also be a Web3 Provider 
   * object, optionally used in conjunction with the fork_block_number
   */
  public fork: string | object = null

  /**
   * Block number the provider should fork from, when the fork option is 
   * specified. If the fork option is specified as a string including the @ 
   * sign and a block number, the block number in the fork parameter takes 
   * precedence.
   */
  public fork_block_number: string | number = null

  /**
   * Same as --networkId option above.
   */
  public network_id: number = null

  /**
   * Date that the first block should start. Use this feature, along with the
   * evm_increaseTime method to test time-dependent code.
   */
  public time: Date = null

  /**
   * Whether or not accounts are locked by default. Defaults to `false`
   */
  public locked: boolean = false

  /**
   * Array of addresses or address indexes specifying which accounts should be unlocked.
   */
  public unlocked_accounts: Array<HexData|number> = null

  /**
   * Specify a path to a directory to save the chain database. If a database 
   * already exists, that chain will be initialized instead of creating a new 
   * one.
   */
  public db_path: String = null

  /**
   * Specify an alternative database instance, for instance MemDOWN.
   */
  public db: Object = null

  /**
   * Whether to report runtime errors from EVM code as RPC errors.
   * This is `true` by default to replicate the error reporting behavior of 
   * previous versions of ganache.
   */
  public vmErrorsOnRPCResponse: boolean = true

  /**
   * The hierarchical deterministic path to use when generating accounts.
   * Default: "m/44'/60'/0'/0/"
   */
  public hdPath: string = "m/44'/60'/0'/0/"

  /**
   * Allows unlimited contract sizes while debugging. By setting this to true, the check within the EVM for contract size limit of 24KB (see EIP-170) is bypassed. Setting this to true will cause ganache-core to behave differently than production environments. (default: false; ONLY set to true during debugging).
   */
  public allowUnlimitedContractSize: boolean = true
  /**
   * Sets the default gas price for transactions if not otherwise specified. 
   * Must be specified as a hex string in wei. Defaults to "0x77359400", or 2 gwei.
   */
  public gasPrice: HexQuantity = new HexQuantity("0x77359400")

  /**
   * Sets the block gas limit. Must be specified as a hex string. Defaults to 
   * "0x6691b7".
   */
  public gasLimit: HexQuantity = new HexQuantity("0x6691b7")
}
