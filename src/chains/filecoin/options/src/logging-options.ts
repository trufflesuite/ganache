import type { Definitions } from "@ganache/flavor";
import { openSync, PathLike } from "fs";
import { Logger, InternalLogger, createLogger } from "@ganache/utils";
import { EOL } from "os";

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
