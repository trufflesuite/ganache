import Connector from "./connector";
import { FlavoredProviderOptions } from "@ganache/options/src/provider-options";
import { FlavoredServerOptions } from "@ganache/options/src/server-options";
import Server from "./server";

export default {
  server: (options?: FlavoredServerOptions) => new Server(options),
  provider: (options?: FlavoredProviderOptions) => Connector.initialize(options).provider
};