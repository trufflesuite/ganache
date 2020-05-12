import Connector from "./connector";
import {ProviderOptions} from "@ganache/options";
import ServerOptions from "./options/server-options";
import Server from "./server";

export default {
  server: (options?: ServerOptions) => new Server(options),
  provider: (options?: ProviderOptions) => Connector.initialize(options).provider
};
