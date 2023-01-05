import { Address } from "@ethereumjs/util";

export type VmTransaction =
  | {
      nonce: bigint;
      gasPrice?: bigint;
      gasLimit: bigint;
      maxPriorityFeePerGas?: never;
      maxFeePerGas?: never;
      to: Address;
      value: bigint;
      data: Buffer;
      getSenderAddress: () => Address;
      getBaseFee: () => bigint;
      getUpfrontCost: () => bigint;
    }
  | {
      nonce: bigint;
      gasPrice?: never;
      gasLimit: bigint;
      maxPriorityFeePerGas?: bigint;
      maxFeePerGas?: bigint;
      to: Address;
      value: bigint;
      data: Buffer;
      getSenderAddress: () => Address;
      getBaseFee: () => bigint;
      getUpfrontCost: () => bigint;
    };
