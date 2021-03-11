import { Providers } from "@ganache/flavors";
import ConnectorLoader from "./src/connector-loader";
import { ProviderOptions, ServerOptions } from "./src/options";
import Server from "./src/server";

export { Status } from "./src/server";
export { ProviderOptions, ServerOptions, serverDefaults } from "./src/options";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: async (options?: ProviderOptions): Promise<Providers> => {
    const connector = await ConnectorLoader.initialize(options);
    return connector.provider;
  }
};
