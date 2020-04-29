import Provider from "./provider";
import ProviderOptions from "./options/provider-options";
import ServerOptions from "./options/server-options";
import Server from "./server";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) => Provider.initialize(options)
};
