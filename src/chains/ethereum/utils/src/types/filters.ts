import { Data } from "@ganache/utils";
import Emittery from "emittery";
import { Tag } from "../things/tags";

export enum FilterTypes {
  log,
  block,
  pendingTransaction
}
export type Topic = string | string[];
export type BaseFilterArgs = { address?: string | string[]; topics?: Topic[] };
export type BlockHashFilterArgs = BaseFilterArgs & { blockHash?: string };
export type RangeFilterArgs = BaseFilterArgs & {
  fromBlock?: string | Tag;
  toBlock?: string | Tag;
};
export type FilterArgs = BlockHashFilterArgs | RangeFilterArgs;

export type InternalFilter = {
  type: FilterTypes;
  updates: Data[];
  unsubscribe: Emittery.UnsubscribeFn;
  filter: FilterArgs;
};
