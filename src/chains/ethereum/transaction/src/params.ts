// NOTE these params may need to be changed at each hardfork
// they can be tracked here: https://github.com/ethereumjs/ethereumjs-vm/blob/master/packages/common/src/hardforks/

export const Params = {
  /**
   *  Per transaction not creating a contract. NOTE: Not payable on data of calls between transactions.
   */
  TRANSACTION_GAS: 21000n,

  /**
   * Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions.
   */
  TRANSACTION_DATA_NON_ZERO_GAS: new Map<
    | "constantinople"
    | "byzantium"
    | "petersburg"
    | "istanbul"
    | "muirGlacier"
    | "berlin"
    | "london",
    bigint
  >([
    ["constantinople", 68n],
    ["byzantium", 68n],
    ["petersburg", 68n],
    ["istanbul", 16n],
    ["muirGlacier", 16n],
    ["berlin", 16n],
    ["london", 16n]
  ]),

  /**
   * Per byte of data attached to a transaction that equals zero. NOTE: Not payable on data of calls between transactions.
   */
  TRANSACTION_DATA_ZERO_GAS: 4n,

  /**
   * Fee for creation a transaction
   */
  TRANSACTION_CREATION: 32000n,

  /* ... */
  /**
   * Gas cost per address in an EIP-2930 Access List transaction
   */
  ACCESS_LIST_ADDRESS_GAS: 2400,

  /**
   * Gas cost per storage key in an EIP-2930 Access List transaction
   */
  ACCESS_LIST_STORAGE_KEY_GAS: 1900
};
