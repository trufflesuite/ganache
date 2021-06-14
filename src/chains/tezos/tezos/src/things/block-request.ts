import { OperationSchema } from "./operation";
import * as t from "io-ts";

const blockRequestSchema = t.type({
  data: t.string,
  operations: t.array(OperationSchema())
});

const newSchema = t.type({
  data: t.number,
  operations: t.array(OperationSchema())
});

export type BlockRequest = t.TypeOf<typeof blockRequestSchema>;

export type NewRequest = t.TypeOf<typeof newSchema>;

export type BlockRequestSchema = typeof blockRequestSchema;

export type NewSchema = typeof newSchema;

export function GetBlockRequestSchema() {
  return blockRequestSchema;
}
