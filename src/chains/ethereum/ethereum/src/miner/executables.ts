import { TypedTransaction } from "@ganache/ethereum-transaction";
import { Heap, Quantity } from "@ganache/utils";

export type InProgressData = {
  transaction: TypedTransaction;
  originBalance: Quantity;
};

export type Executables = {
  inProgress: Map<string, Set<InProgressData>>;
  pending: Map<string, Heap<TypedTransaction>>;
};
