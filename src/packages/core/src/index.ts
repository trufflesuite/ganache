import Connector from "./connector";
import { ProviderOptions, ServerOptions } from "./options";
import Server from "./server";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) => Connector.initialize(options).provider
};
