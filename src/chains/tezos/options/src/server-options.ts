import { Definitions, ServerConfig } from "@ganache/options";
import { normalize } from "./helpers";

export const ServerOptions: Definitions<ServerConfig> = {
  rpcEndpoint: {
    normalize,
    cliDescription:
      "Defines the endpoint route the HTTP and WebSocket servers will listen on.",
    default: () => {
      return "/tz";
    },
    defaultDescription: '"/tz" (Tezos)'
  },
  ws: undefined,
  wsBinary: undefined
};
