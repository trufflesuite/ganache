/**
 * Returned if the transaction contains an invalid signature.
 */
export const INVALID_SENDER = "invalid sender";

/**
 * Returned if the nonce of a transaction is lower than the one present in the local chain.
 */
export const NONCE_TOO_LOW = "nonce too low";

/**
 * Returned if a transaction's gas price is below the minimum configured for the transaction pool.
 */
export const UNDERPRICED = "transaction underpriced";

/**
 * Returned if a transaction's gas price is below the minimum configured for the transaction pool.
 */
export const REPLACED = "transaction replaced by better transaction";

/**
 * Returned if the transaction is specified to use less gas than required to start the invocation.
 */
export const INTRINSIC_GAS_TOO_LOW = "intrinsic gas too low";

/**
 * Returned if the transaction's `to` address is empty and its `data`/`input` field is greater than the EIP-3860 limit of
 * 49152 bytes. Can be bypassed by setting the `--chain.allowUnlimitedInitCodeSize` flag to `true`.
 */
export const INITCODE_TOO_LARGE =
  "Transaction's `data`/`input` field is greater than 49152 bytes, which isn't allowed as of EIP-3860. To bypass this restriction set the `--chain.allowUnlimitedInitCodeSize` flag to `true`.";

/**
 * Returned if a transaction's requested gas limit exceeds the maximum allowance of the current block.
 */
export const GAS_LIMIT = "exceeds block gas limit";

/**
 * Prefix for a single VM Exception occurring when running a transaction or block
 */
export const VM_EXCEPTION = "VM Exception while processing transaction: ";

/**
 * Prefix for multiple VM Exceptions occurring when running transactions or a block
 */
export const VM_EXCEPTIONS =
  "Multiple VM Exceptions while processing transactions: : \n\n";

/**
 * Returned if a replacement transaction is sent while the potentially replaced transaction is being mined.
 */
export const TRANSACTION_LOCKED =
  "transaction can't be replaced, mining has already started. (please open an issue with reproduction steps: https://github.com/trufflesuite/ganache/issues/new)";

/**
 * Returned if a transaction may require more funds than than account currently has available.
 */
export const INSUFFICIENT_FUNDS = "insufficient funds for gas * price + value";
