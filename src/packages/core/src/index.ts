import Connector from "./connector";
import { ProviderOptions, ServerOptions } from "./options";
import Server from "./server";

export { ProviderOptions, ServerOptions } from "./options";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) =>
    Connector.initialize(options).provider
};
