import { Definitions } from "@ganache/options";

export type ServerConfig = {
  options: {
    /**
     * Enable a websocket server. This is `true` by default.
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
     * Wether or not websockets should response with binary data (ArrayBuffers) or
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
    default: () => true,
    legacyName: "ws"
  },
  wsBinary: {
    normalize,
    default: () => "auto"
  },
  keepAliveTimeout: {
    normalize: () => {
      throw new Error("`keepAliveTimeout` was removed in v3");
    },
    legacyName: "keepAliveTimeout"
  }
};
