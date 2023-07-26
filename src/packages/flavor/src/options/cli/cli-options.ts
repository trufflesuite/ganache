import { Definitions } from "@ganache/options";
import { CliConfig } from "./cli-config";

const isDocker =
  "DOCKER" in process.env && process.env.DOCKER.toLowerCase() === "true";

export type CliOptions = Definitions<CliConfig>;
export const CliOptions: CliOptions = {
  port: {
    normalize: port => {
      if (port < 1 || port > 65535) {
        throw new Error(`Invalid port number '${port}'`);
      }
      return port;
    },
    cliDescription: "The port to listen on.",
    default: () => 8545,
    legacyName: "port",
    cliType: "number",
    cliAliases: ["p", "port"]
  },
  host: {
    normalize: host => {
      host = host.trim();
      if (host === "") {
        throw new Error("Cannot leave host blank; please provide a host");
      }
      return host;
    },
    cliDescription: "Hostname to listen on.",
    default: () => {
      return isDocker ? "0.0.0.0" : "127.0.0.1";
    },
    legacyName: "host",
    cliType: "string",
    cliAliases: ["h", "host"]
  }
};
