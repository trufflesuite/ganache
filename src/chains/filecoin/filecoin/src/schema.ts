import FilecoinApi from "./api";
import { Schema } from "@filecoin-shipyard/lotus-client-schema";

const GanacheSchema: Schema = {
  methods: {}
} as Schema;

// Use the FilecoinAPI to create a schema object representing the functions supported.
for (const methodName of Object.getOwnPropertyNames(FilecoinApi.prototype)) {
  if (methodName == "constructor") {
    continue;
  }

  let schemaName = methodName.replace("Filecoin.", "");
  GanacheSchema.methods[schemaName] = {};
}

export default GanacheSchema;
