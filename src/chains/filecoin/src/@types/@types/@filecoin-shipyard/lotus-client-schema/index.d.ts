declare module "@filecoin-shipyard/lotus-client-schema" {
  export type Schema = {
    methods: {
      [propertyName: string]: {};
    };
  };

  export type TestNetDeclaration = {
    fullNode: Schema;
    storageMiner: Schema;
  };

  let testnet: TestNetDeclaration;
}
