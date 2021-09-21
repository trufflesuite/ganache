import { TypedTransaction } from "@ganache/ethereum-transaction";
import { Heap } from "@ganache/utils";

export type Executables = {
  inProgress: Set<TypedTransaction>;
  pending: Map<string, Heap<TypedTransaction>>;
};
