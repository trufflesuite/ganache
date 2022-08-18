export type VmTransaction =
  | {
      nonce: bigint;
      gasPrice?: bigint;
      gasLimit: bigint;
      maxPriorityFeePerGas?: never;
      maxFeePerGas?: never;
      to: { buf: Buffer };
      value: bigint;
      data: Buffer;
      getSenderAddress: () => { buf: Buffer };
      getBaseFee: () => bigint;
      getUpfrontCost: () => bigint;
    }
  | {
      nonce: bigint;
      gasPrice?: never;
      gasLimit: bigint;
      maxPriorityFeePerGas?: bigint;
      maxFeePerGas?: bigint;
      to: { buf: Buffer };
      value: bigint;
      data: Buffer;
      getSenderAddress: () => { buf: Buffer };
      getBaseFee: () => bigint;
      getUpfrontCost: () => bigint;
    };
