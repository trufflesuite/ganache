import { OperationSchema } from "./operation";
import * as t from "io-ts";

const blockRequestSchema = t.type({
  data: t.string,
  operations: t.array(OperationSchema())
});

export type BlockRequest = t.TypeOf<typeof blockRequestSchema>;

export type BlockRequestSchema = typeof blockRequestSchema;

export function BlockRequestSchema() {
  return blockRequestSchema;
}
