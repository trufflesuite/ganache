import { Definitions } from "@ganache/options";

export type ServerConfig = {
  options: {
    /**
     * Port number to listen on when running as a server. Defaults to `8545`
     */
    readonly port: {
      type: number;
      hasDefault: true;
    };

    /**
     * Enable a websocket server. This is `true` by default.
     */
    readonly ws: {
      type: boolean;
      hasDefault: true;
    };

    /**
     * Wether or not websockets should response with binary data (ArrayBuffers) or
     * strings.
     *
     * Default is "auto", which responds using the same format as the incoming
     * message that triggered the response.
     */
    readonly wsBinary: {
      type: boolean | "auto";
      hasDefault: true;
    };
  };
  exclusiveGroups: [];
};

export const ServerOptions: Definitions<ServerConfig> = {
  port: {
    normalize: rawInput => rawInput,
    default: () => 8545
  },
  ws: {
    normalize: rawInput => rawInput,
    default: () => true
  },
  wsBinary: {
    normalize: rawInput => rawInput,
    default: () => "auto"
  }
};
