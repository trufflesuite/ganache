import { RuntimeTransaction } from "@ganache/ethereum-transaction";
import { utils } from "@ganache/utils";

export type Executables = {
  inProgress: Set<RuntimeTransaction>;
  pending: Map<string, utils.Heap<RuntimeTransaction>>;
};
