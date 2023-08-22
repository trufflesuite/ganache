// NOTE these params may need to be changed at each hardfork
// they can be tracked here: https://github.com/ethereumjs/ethereumjs-vm/blob/master/packages/common/src/hardforks/

export const Params = {
  /**
   *  Per transaction not creating a contract. NOTE: Not payable on data of calls between transactions.
   */
  TRANSACTION_GAS: 21000n,

  /**
   * Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions.
   * Ganache supports eth_call and debuging old transactions that should be run
   * in the context of their original hardfork, so hardforks we don't support
   * are listed here.
   */
  TRANSACTION_DATA_NON_ZERO_GAS: new Map<
    | "chainstart"
    | "homestead"
    | "dao"
    | "tangerineWhistle"
    | "spuriousDragon"
    | "byzantium"
    | "constantinople"
    | "petersburg"
    | "istanbul"
    | "muirGlacier"
    | "berlin"
    | "london"
    | "arrowGlacier"
    | "grayGlacier"
    | "merge"
    | "mergeForkIdTransition"
    | "shanghai",
    bigint
  >([
    ["chainstart", 68n],
    ["homestead", 68n],
    ["dao", 68n],
    ["tangerineWhistle", 68n],
    ["spuriousDragon", 68n],
    ["byzantium", 68n],
    ["constantinople", 68n],
    ["petersburg", 68n],
    ["istanbul", 16n],
    ["muirGlacier", 16n],
    ["berlin", 16n],
    ["london", 16n],
    ["arrowGlacier", 16n],
    ["grayGlacier", 16n],
    ["merge", 16n],
    ["mergeForkIdTransition", 16n],
    ["shanghai", 16n]
  ]),

  /**
   * Per byte of data attached to a transaction that equals zero. NOTE: Not payable on data of calls between transactions.
   */
  TRANSACTION_DATA_ZERO_GAS: 4n,

  /**
   * Fee for creation a transaction (includes base fee of `TRANSACTION_GAS`)
   */
  TRANSACTION_CREATION_GAS: 53000n,

  /**
   * Only used after shanghai hardFork, `initcode` per byte cost is 0.0625.
   * While fractional gas costs are not permitted in the EVM, we can approximate
   * it by charging per-word.
   */
  INITCODE_WORD_GAS: 2n,

  /**
   * Gas cost per address in an EIP-2930 Access List transaction
   */
  ACCESS_LIST_ADDRESS_GAS: 2400,

  /**
   * Gas cost per storage key in an EIP-2930 Access List transaction
   */
  ACCESS_LIST_STORAGE_KEY_GAS: 1900
};
