import type { BN } from "ethereumjs-util";

export interface VmTransaction {
  nonce: BN;
  gasPrice: BN;
  gasLimit: BN;
  to: Buffer;
  value: BN;
  data: Buffer;
  getSenderAddress: () => Buffer;
  getBaseFee: () => BN;
  getUpfrontCost: () => BN;
}
