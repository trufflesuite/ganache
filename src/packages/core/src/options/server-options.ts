import { Definitions } from "@ganache/options";

export type ServerConfig = {
  options: {
    /**
     * Enable a websocket server.
     *
     * @default true
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
     * @default "auto"
     */
    readonly wsBinary: {
      type: boolean | "auto";
      hasDefault: true;
    };

    /**
     * @obsolete Option removed in v3
     */
    readonly keepAliveTimeout: {
      type: void;
      legacy: {
        /**
         * @obsolete Option removed in v3
         */
        keepAliveTimeout: void;
      };
    };
  };
};
const normalize = <T>(rawInput: T) => rawInput;

export const ServerOptions: Definitions<ServerConfig> = {
  ws: {
    normalize,
    shortDescription: "Enable a websocket server.",
    default: () => true,
    legacyName: "ws"
  },
  wsBinary: {
    normalize,
    shortDescription:
      "Whether or not websockets should response with binary data (ArrayBuffers) or strings.",
    default: () => "auto"
  },
  keepAliveTimeout: {
    normalize: () => {
      throw new Error("`keepAliveTimeout` was removed in v3");
    },
    shortDescription: "Option removed in v3",
    disableInCLI: true,
    legacyName: "keepAliveTimeout"
  }
};
