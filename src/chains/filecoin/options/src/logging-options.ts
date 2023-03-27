import { Definitions } from "@ganache/options";
import { openSync, PathLike } from "fs";
import { Logger, InternalLogger, createLogger } from "@ganache/utils";

export type LoggingConfig = {
  options: {
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
    normalize: (logger: Logger, config) => {
      return createLogger({
        file: (config as any).file,
        baseLogger: logger
      });
    },
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    default: config => {
      return createLogger({
        file: config.file,
        baseLogger: console
      });
    }
  }
};
