import Provider from "./src/provider";
import ProviderOptions from "./src/options/provider-options";
import ServerOptions from "./src/options/server-options";
import Server from "./src/server";

// `server` and `provider` are here for backwards compatability
export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) => Provider.initialize(options),
};
