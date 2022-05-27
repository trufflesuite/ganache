import FilecoinApi from "./api";
import LotusSchema from "@filecoin-shipyard/lotus-client-schema";
export type Schema = {
  methods: {
    [propertyName: string]: {
      subscription?: boolean;
      namespace?: string;
    };
  };
};

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
  if (methodName.startsWith("Filecoin.")) {
    const schemaName = methodName.replace("Filecoin.", "");

    GanacheSchema.methods[schemaName] = {
      subscription: combinedMethods[schemaName].subscription === true
    };
  } else {
    const namespaceMatch = /^(.+)\./.exec(methodName);
    if (namespaceMatch) {
      const namespace = namespaceMatch[1];
      const schemaName = methodName.replace(".", "");

      GanacheSchema.methods[schemaName] = {
        subscription: /Notify$/i.exec(methodName) !== null,
        namespace
      };
    }
  }
}

export default GanacheSchema;
