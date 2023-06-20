import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { openSync, PathLike } from "fs";
import { Logger, InternalLogger, createLogger } from "@ganache/utils";
import { EOL } from "os";

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
      rawType: Logger;
      type: InternalLogger;
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
     * Set to `true` to disable writing logs to stdout (or logging.logger if specified).
     * This option does not impact writing logs to a file (with logging.file).
     *
     * @defaultValue false
     */
    readonly quiet: {
      type: boolean;
      hasDefault: true;
    };

    /**
     * The file to append logs to.
     *
     * Can be a filename, or an instance of URL.
     * note: the URL scheme must be `file`, e.g., `file://path/to/file.log`.
     *
     * By default no log file is created.
     */
    readonly file: {
      type: number;
      rawType: PathLike;
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
    cliDescription: "Set to `true` to disable writing logs to `logger.log` (`stdout` by default).",
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
    normalize: (raw: PathLike): number => {
      let descriptor: number;

      try {
        descriptor = openSync(raw, "a");
      } catch (err) {
        const details = (err as Error).message;
        throw new Error(
          `Failed to open log file ${raw}. Please check if the file path is valid and if the process has write permissions to the directory.${EOL}${details}`
        );
      }
      return descriptor;
    },
    cliDescription: "The file to append logs to.",
    cliType: "string"
  },
  logger: {
    normalize: (logger: Logger, config: Readonly<{ file: number }>) => {
      return createLogger({
        file: config.file,
        baseLogger: logger
      });
    },
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    default: config => {
      const baseLogger = config.quiet ? { log: () => {} } : console;
      return createLogger({
        file: config.file,
        baseLogger
      });
    },
    legacyName: "logger"
  }
};
