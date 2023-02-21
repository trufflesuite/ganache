import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { promises, openSync, closeSync } from "fs";
const open = promises.open;
import { format } from "util";

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
     * The path to a file to log to. If this option is set, Ganache will log output
     * to a file located at the path.
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
      // this will throw if the file is not writable
      try {
        const fh = openSync(rawInput, "a");
        closeSync(fh);
      } catch (err) {
        throw new Error(
          `Failed to write logs to ${rawInput}. Please check if the file path is valid and if the process has write permissions to the directory.`
        );
      }

      return rawInput;
    },
    cliDescription: "The path of a file to which logs will be appended.",
    cliType: "string"
  },
  logger: {
    normalize,
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    // disable the default logger if `quiet` is `true`
    default: config => {
      const { log } = createLogger(config);
      return {
        log
      };
    },
    legacyName: "logger"
  }
};

type CreateLoggerConfig = {
  quiet?: boolean;
  file?: string;
};

/**
 * Create a logger function based on the provided config.
 *
 * @param config specifying the configuration for the logger
 * @returns an object containing a `log` function and optional `getWaitHandle`
 * function returning a `Promise<void>` that resolves when any asyncronous
 * activies are completed.
 */
export function createLogger(config: { quiet?: boolean; file?: string }): {
  log: LogFunc;
  getWaitHandle?: () => Promise<void>;
} {
  const logToConsole = config.quiet
    ? async () => {}
    : async (message: any, ...optionalParams: any[]) =>
        console.log(message, ...optionalParams);

  if ("file" in config) {
    const diskLogFormatter = (message: any) => {
      const linePrefix = `${new Date().toISOString()} `;
      return message.toString().replace(/^/gm, linePrefix);
    };

    // we never close this handle, which is only ever problematic if we create a
    // _lot_ of handles. This can't happen, except (potentially) in tests,
    // because we only ever create one logger per Ganache instance.
    const whenHandle = open(config.file, "a");

    let writing = Promise.resolve<void>(null);

    const log = (message: any, ...optionalParams: any[]) => {
      const formattedMessage = format(message, ...optionalParams);
      // we are logging to a file, but we still need to log to console
      logToConsole(formattedMessage);

      const currentWriting = writing;
      writing = whenHandle.then(async handle => {
        await currentWriting;

        return handle.appendFile(diskLogFormatter(formattedMessage) + "\n");
      });
    };
    return {
      log,
      getWaitHandle: () => writing
    };
  } else {
    return {
      log: logToConsole
    };
  }
}
