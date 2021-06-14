import { BlockFullHeader } from "@taquito/rpc";

export type Checkpoint = {
  block: BlockFullHeader;
  save_point: number;
  caboose: number;
  history_mode: "full" | "archive" | "rolling";
};
