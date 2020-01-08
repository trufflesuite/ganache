import * as jsbiHelpers from "./src/utils/jsbi-helpers";
jsbiHelpers.install();

import Provider from "./src/provider";
import ProviderOptions from "./src/options/provider-options";
import ServerOptions from "./src/options/server-options";
import Server from "./src/server";

// `server` and `provider` are here for backwards compatability
export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) => new Provider(options),
  Server,
  Provider
};
