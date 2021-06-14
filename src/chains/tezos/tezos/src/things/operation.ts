import * as t from "io-ts";

const operationSchema = t.type({
  branch: t.string,
  data: t.string
});

export type Operation = t.TypeOf<typeof operationSchema>;

export function OperationSchema() {
  return operationSchema;
}
