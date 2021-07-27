import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BN } from "ethereumjs-util";
import { Hardfork } from "./hardfork";
import { Params } from "./params";

const { BUFFER_EMPTY, BUFFER_32_ZERO } = utils;

const MAX_UINT64 = 1n << (64n - 1n);

/**
 * Compute the 'intrinsic gas' for a message with the given data.
 * @param data The transaction's data
 * @param hardfork The hardfork use to determine gas costs
 * @returns The absolute minimum amount of gas this transaction will consume,
 * or `-1` if the data in invalid (gas consumption would exceed `MAX_UINT64`
 * (`(2n ** 64n) - 1n`).
 */
export const calculateIntrinsicGas = (data: Data, common: Common) => {
  const hardfork = common.hardfork() as Hardfork;
  // Set the starting gas for the raw transaction
  let gas = Params.TRANSACTION_GAS;
  if (data) {
    const input = data.toBuffer();
    // Bump the required gas by the amount of transactional data
    const dataLength = input.byteLength;
    if (dataLength > 0) {
      const TRANSACTION_DATA_NON_ZERO_GAS = Params.TRANSACTION_DATA_NON_ZERO_GAS.get(
        hardfork
      );
      const TRANSACTION_DATA_ZERO_GAS = Params.TRANSACTION_DATA_ZERO_GAS;

      // Zero and non-zero bytes are priced differently
      let nonZeroBytes: bigint = 0n;
      for (const b of input) {
        if (b !== 0) {
          nonZeroBytes++;
        }
      }

      // Make sure we don't exceed uint64 for all data combinations.
      // TODO: make sure these upper-bound checks are safe to remove, then
      // remove if so.
      // NOTE: This is an upper-bounds limit ported from geth that doesn't
      // make sense for Ethereum, as exceeding the upper bound would require
      // something like 200+ Petabytes of data.
      // https://github.com/ethereum/go-ethereum/blob/cf856ea1ad96ac39ea477087822479b63417036a/core/state_transition.go#L106-L141
      //
      // explanation:
      // `(MAX_UINT64 - gas) / TRANSACTION_DATA_NON_ZERO_GAS` is the maximum
      // number of "non-zero bytes" geth can handle.
      if ((MAX_UINT64 - gas) / TRANSACTION_DATA_NON_ZERO_GAS < nonZeroBytes) {
        return -1n;
      }
      gas += nonZeroBytes * TRANSACTION_DATA_NON_ZERO_GAS;

      const zeroBytes = BigInt(dataLength) - nonZeroBytes;
      // explanation:
      // `(MAX_UINT64 - gas) / TRANSACTION_DATA_ZERO_GAS` is the maximum number
      // of "zero bytes" geth can handle after subtracting out the cost of
      // the "non-zero bytes"
      if ((MAX_UINT64 - gas) / TRANSACTION_DATA_ZERO_GAS < zeroBytes) {
        return -1n;
      }
      gas += zeroBytes * TRANSACTION_DATA_ZERO_GAS;
    }
  }
  return gas;
};

export class BaseTransaction {
  public type: Quantity;
  public nonce: Quantity;
  public gas: Quantity;
  public to: Address | null;
  public value: Quantity;
  public data: Data;
  public v: Quantity | null;
  public r: Quantity | null;
  public s: Quantity | null;

  public from: Data | null;

  public common: Common;

  constructor(common: Common) {
    this.common = common;
  }

  public calculateIntrinsicGas() {
    return calculateIntrinsicGas(this.data, this.common);
  }
}
