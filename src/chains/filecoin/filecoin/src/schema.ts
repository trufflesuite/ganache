import FilecoinApi from "./api";
import LotusSchema, { Schema } from "@filecoin-shipyard/lotus-client-schema";

const GanacheSchema: Schema = {
  methods: {}
} as Schema;

const combinedMethods = {
  ...LotusSchema.mainnet.fullNode.methods,
  ...LotusSchema.mainnet.storageMiner.methods,
  ...LotusSchema.mainnet.gatewayApi.methods,
  ...LotusSchema.mainnet.walletApi.methods,
  ...LotusSchema.mainnet.workerApi.methods
};

// Use the FilecoinAPI to create a schema object representing the functions supported.
for (const methodName of Object.getOwnPropertyNames(FilecoinApi.prototype)) {
  if (!methodName.startsWith("Filecoin.")) {
    continue;
  }

  let schemaName = methodName.replace("Filecoin.", "");
  GanacheSchema.methods[schemaName] = {
    subscription: combinedMethods[schemaName].subscription === true
  };
}

export default GanacheSchema;
