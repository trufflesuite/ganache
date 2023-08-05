import { Quantity } from "@ganache/utils";

export type FeeHistory = {
  oldestBlock: Quantity;
  baseFeePerGas: Quantity[];
  gasUsedRatio: number[];
  reward?: Array<Quantity[]>;
};
