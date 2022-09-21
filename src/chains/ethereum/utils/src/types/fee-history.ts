import { Data, Quantity } from "@ganache/utils";

export type FeeHistory = {
  oldestBlock: Data;
  baseFeePerGas: Quantity[];
  gasUsedRatio: number[];
  reward?: Array<Quantity[]>;
};
