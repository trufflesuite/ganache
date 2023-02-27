import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { appendFileSync } from "fs";

export type LogFunc = (message?: any, ...optionalParams: any[]) => void;

type Logger = {
  log: LogFunc;
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
     * If you set this option, Ganache will write logs to a file located at the
     * specified path.
     */
    readonly file: {
      type: string;
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
  logger: {
    normalize,
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    // disable the default logger if `quiet` is `true`
    default: config => {
      return {
        log: config.quiet ? () => {} : console.log
      };
    },
    legacyName: "logger"
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
    normalize: rawInput => {
      // this will throw if the file is not writable, and creates the log file for later appending
      try {
        appendFileSync(rawInput, Buffer.alloc(0));
      } catch (err) {
        throw new Error(
          `Failed to write logs to ${rawInput}. Please check if the file path is valid and if the process has write permissions to the directory.`
        );
      }

      return rawInput;
    },
    cliDescription:
      "If set, Ganache will write logs to a file located at the specified path.",
    cliType: "string"
  }
};
