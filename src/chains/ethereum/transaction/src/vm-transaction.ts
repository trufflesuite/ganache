import type { BN } from "ethereumjs-util";

export interface VmTransaction {
  nonce: BN;
  gasPrice: BN;
  gasLimit: BN;
  to: { buf: Buffer };
  value: BN;
  data: Buffer;
  getSenderAddress: () => { buf: Buffer };
  getBaseFee: () => BN;
  getUpfrontCost: () => BN;
}
