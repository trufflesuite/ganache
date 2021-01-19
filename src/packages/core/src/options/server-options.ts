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
  }
};
