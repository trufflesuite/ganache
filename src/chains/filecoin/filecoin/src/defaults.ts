import { FilecoinDefaults } from "@ganache/filecoin-options";
export type FilecoinDefaults = typeof FilecoinDefaults & {
  server: {
    rpcEndpoint: { default: () => "/rpc/v0" };
    port: { default: () => 7777 };
  };
};

export const defaults: FilecoinDefaults = {
  server: {
    rpcEndpoint: { default: () => "/rpc/v0" },
    port: {
      default: () => 7777
    }
  },
  ...FilecoinDefaults
};
