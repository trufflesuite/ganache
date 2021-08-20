import { DefaultFlavor, FilecoinFlavorName } from "@ganache/flavors";
import { Definitions } from "@ganache/options";

export type ServerConfig = {
  options: {
    /**
     * Enable a websocket server.
     *
     * @defaultValue true
     */
    readonly ws: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use server.ws instead.
         */
        ws: boolean;
      };
    };

    /**
     * Whether or not websockets should response with binary data (ArrayBuffers) or
     * strings.
     *
     * Default is "auto", which responds using the same format as the incoming
     * message that triggered the response.
     *
     * @defaultValue "auto"
     */
    readonly wsBinary: {
      type: boolean | "auto";
      hasDefault: true;
    };

    /**
     * Defines the endpoint route the HTTP and WebSocket servers will listen on.
     *
     * @defaultValue "/"
     */
    readonly rpcEndpoint: {
      type: string;
      hasDefault: true;
    };
  };
};
const normalize = <T>(rawInput: T) => rawInput;

export const ServerOptions: Definitions<ServerConfig> = {
  ws: {
    normalize,
    cliDescription: "Enable a websocket server.",
    default: () => true,
    legacyName: "ws",
    cliType: "boolean"
  },
  wsBinary: {
    normalize,
    cliDescription:
      "Whether or not websockets should response with binary data (ArrayBuffers) or strings.",
    default: () => "auto",
    cliChoices: [true, false, "auto"] as any[]
  },
  rpcEndpoint: {
    normalize,
    cliDescription:
      "Defines the endpoint route the HTTP and WebSocket servers will listen on.",
    default: (config, flavor) => {
      switch (flavor) {
        case FilecoinFlavorName:
          return "/rpc/v0";
        case DefaultFlavor:
        default:
          return "/";
      }
    },
    defaultDescription: '"/" (Ethereum), "/rpc/v0" (Filecoin)'
  }
};
