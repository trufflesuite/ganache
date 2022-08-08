import { TypedTransaction } from "@ganache/ethereum-transaction";
import { Heap, Quantity } from "@ganache/utils";

export type InProgressData = {
  transaction: TypedTransaction;
  originBalance: Quantity;
};

export type InProgress = Map<string, Set<InProgressData>>;
export type Executables = {
  inProgress: InProgress;
  pending: Map<string, Heap<TypedTransaction>>;
};
