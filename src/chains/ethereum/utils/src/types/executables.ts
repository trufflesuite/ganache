import { utils } from "@ganache/utils";
import { Transaction } from "../things/transaction";

export type Executables = {
  inProgress: Set<Transaction>;
  pending: Map<string, utils.Heap<Transaction>>;
};
