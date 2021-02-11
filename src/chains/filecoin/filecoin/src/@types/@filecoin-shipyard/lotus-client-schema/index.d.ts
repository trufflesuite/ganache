declare module "@filecoin-shipyard/lotus-client-schema" {
  export type Schema = {
    methods: {
      [propertyName: string]: {
        subscription?: boolean;
      };
    };
  };

  export type MainNetDeclaration = {
    common: Schema;
    fullNode: Schema;
    storageMiner: Schema;
    gatewayApi: Schema;
    walletApi: Schema;
    workerApi: Schema;
  };

  let mainnet: MainNetDeclaration;
}
