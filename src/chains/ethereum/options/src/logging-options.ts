import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { appendFileSync } from "fs";

export type Logger = {
  log(message?: any, ...optionalParams: any[]): void;
};

export type LoggingConfig = {
  options: {
    /**
     * Set to `true` to log EVM opcodes.
     *
     * @defaultValue false
     */
    readonly debug: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use logging.debug instead
         */
        debug: boolean;
      };
    };

    /**
     * An object, like `console`, that implements a `log` function.
     *
     * Defaults to `console` (logs to stdout).
     *
     * @example
     * ```typescript
     * {
     * 	log: (message: any) => {
     * 		// handle `message`
     * 	}
     * }
     * ```
     */
    readonly logger: {
      type: Logger;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use logging.logger instead
         */
        logger: Logger;
      };
    };

    /**
     * Set to `true` to log detailed RPC requests.
     *
     * @defaultValue false
     */
    readonly verbose: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use logging.verbose instead
         */
        verbose: boolean;
      };
    };

    /**
     * Set to `true` to disable logging. This option overrides
     * logging.logger and option.verbose.
     *
     * @defaultValue false
     */
    readonly quiet: {
      type: boolean;
      hasDefault: true;
    };

    /**
     * The path to a file to log to. If this option is set, Ganache will log output
     * to a file located at the path.
     */
    readonly filePath: {
      type: string;
    };

    /**
     * Set to `true` to include a timestamp in the log output.
     */
    readonly includeTimestamp: {
      type: boolean;
      hasDefault: true;
    };
  };
};

export const LoggingOptions: Definitions<LoggingConfig> = {
  debug: {
    normalize,
    cliDescription: "Set to `true` to log EVM opcodes.",
    default: () => false,
    legacyName: "debug",
    cliType: "boolean"
  },
  quiet: {
    normalize,
    cliDescription: "Set to `true` to disable logging.",
    default: () => false,
    cliAliases: ["q", "quiet"],
    cliType: "boolean"
  },
  verbose: {
    normalize,
    cliDescription: "Set to `true` to log detailed RPC requests.",
    default: () => false,
    legacyName: "verbose",
    cliAliases: ["v", "verbose"],
    cliType: "boolean"
  },
  filePath: {
    normalize,
    cliDescription: "The path to a file to log to.",
    cliAliases: ["log-file"],
    cliType: "string"
  },
  includeTimestamp: {
    normalize,
    cliDescription: "Set to `true` to include a timestamp in the log output.",
    cliType: "boolean",
    default: () => false
  },
  logger: {
    normalize,
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    // disable the default logger if `quiet` is `true`
    default: config => {
      let logger: (message?: any, ...optionalParams: any[]) => void;
      if (config.filePath == null) {
        logger = config.quiet ? () => {} : console.log;
      } else {
        const formatter = config.includeTimestamp
          ? (message, additionalParams) =>
              `${Date.now()}\t${message} ${additionalParams.join(", ")}\n`
          : (message, additionalParams) =>
              `${message} ${additionalParams.join(", ")}\n`;

        logger = (message: any, ...additionalParams: any[]) => {
          appendFileSync(
            config.filePath,
            formatter(message.replace(/\n/g, "\n\t"), additionalParams)
          );
        };
      }

      return {
        log: logger
      };
    },
    legacyName: "logger"
  }
};
