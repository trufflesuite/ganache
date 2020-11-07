import Connector from "./src/connector";
import { ProviderOptions, ServerOptions } from "./src/options";
import Server from "./src/server";

export { ProviderOptions, ServerOptions } from "./src/options";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) =>
    Connector.initialize(options).provider
};
