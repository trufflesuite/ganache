declare module "@filecoin-shipyard/lotus-client-schema" {
  export type Schema = {
    methods: {
      [propertyName: string]: {
        subscription?: boolean;
      };
    };
  };

  export type MainNetDeclaration = {
    fullNode: Schema;
    storageMiner: Schema;
  };

  let mainnet: MainNetDeclaration;
}
