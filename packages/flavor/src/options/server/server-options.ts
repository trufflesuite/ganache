import { Definitions } from "@ganache/options";
import { kMaxLength } from "buffer";
import { ServerConfig } from "./server-config";

const normalize = <T>(rawInput: T) => rawInput;

export type ServerOptions = Definitions<ServerConfig>;
export const ServerOptions: ServerOptions = {
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
    cliChoices: ["true", "false", "auto"] as any[]
  },
  rpcEndpoint: {
    normalize,
    cliDescription:
      "Defines the endpoint route the HTTP and WebSocket servers will listen on.",
    default: () => "/"
  },
  chunkSize: {
    normalize: number => {
      if (number < 0 || number > kMaxLength) {
        throw new Error(`--server.chunkSize must be >= 0 and <= ${kMaxLength}`);
      }
      return number;
    },
    cliDescription:
      "For memory and performance reasons ganache may respond with chunked transfer-encoding over HTTP and fragmented send over WebSockets. This option allows you to control the approximate size of each chunk.",
    default: () => 1024 * 1024,
    cliType: "number"
  }
};
