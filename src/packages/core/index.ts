import ConnectorLoader from "./src/connector-loader";
import { ProviderOptions, ServerOptions } from "./src/options";
import Server from "./src/server";

export { Status } from "./src/server";
export { ProviderOptions, ServerOptions, serverDefaults } from "./src/options";
export { Server } from "./src/server";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) =>
    ConnectorLoader.initialize(options).provider
};
