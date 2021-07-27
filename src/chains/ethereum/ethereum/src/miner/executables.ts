import { TypedTransaction } from "@ganache/ethereum-transaction/src/transaction-types";
import { utils } from "@ganache/utils";

export type Executables = {
  inProgress: Set<TypedTransaction>;
  pending: Map<string, utils.Heap<TypedTransaction>>;
};
