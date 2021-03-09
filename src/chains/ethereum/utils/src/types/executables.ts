import { utils } from "@ganache/utils";
import { RuntimeTransaction } from "../things/transaction";

export type Executables = {
  inProgress: Set<RuntimeTransaction>;
  pending: Map<string, utils.Heap<RuntimeTransaction>>;
};
