import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { appendFileSync } from "fs";
import { format } from "util";

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
    readonly file: {
      type: string;
    };

    /**
     * Set to `true` to include a timestamp in the log output.
     */
    readonly timestamps: {
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
  file: {
    normalize,
    cliDescription: "The path of a file to which logs will be appended.",
    cliType: "string"
  },
  timestamps: {
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
      const consoleLogger = config.quiet ? () => {} : console.log;

      if (config.file == null) {
        logger = consoleLogger;
      } else {
        const diskLogFormatter = config.timestamps
          ? message => {
              const linePrefix = `${new Date().toISOString()} `;
              // Matches _after_ a new line character _or_ the start of the
              // string. Essentially the start of every line
              return message.replace(/^|(?<=\n)/g, linePrefix);
            }
          : message => message;

        const formatter = (message, additionalParams) => {
          const formattedMessage = format(message, ...additionalParams);
          // we are logging to a file, but we still need to log to console
          consoleLogger(formattedMessage);
          return diskLogFormatter(formattedMessage) + "\n";
        };

        logger = (message: any, ...additionalParams: any[]) => {
          appendFileSync(config.file, formatter(message, additionalParams));
        };
      }

      return {
        log: logger
      };
    },
    legacyName: "logger"
  }
};
