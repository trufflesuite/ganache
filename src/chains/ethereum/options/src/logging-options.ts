import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { openSync, PathLike } from "fs";
import { Logger, InternalLogger, createLogger } from "@ganache/utils";

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
     * Note: If you provide a `URL` it must use the `path://` protocol.
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
    normalize: (raw: PathLike): number => {
      let descriptor: number;

      try {
        descriptor = openSync(raw, "a");
      } catch (err) {
        throw new Error(
          `Failed to open log file ${raw}. Please check if the file path is valid and if the process has write permissions to the directory.`
        );
      }
      return descriptor;
    },
    cliDescription:
      "If set, Ganache will write logs to a file located at the specified path.",
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
