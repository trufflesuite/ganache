import { RuntimeTransaction } from "@ganache/ethereum-transaction";
import { Heap } from "@ganache/utils";

export type Executables = {
  inProgress: Set<RuntimeTransaction>;
  pending: Map<string, Heap<RuntimeTransaction>>;
};
