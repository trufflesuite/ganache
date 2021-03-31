import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type Logger = {
  log(message?: any, ...optionalParams: any[]): void;
};

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
      type: Logger;
      hasDefault: true;
    };
  };
};

const logger: Logger = { log: console.log };

export const LoggingOptions: Definitions<LoggingConfig> = {
  logger: {
    normalize,
    cliDescription:
      "An object, like `console`, that implements a `log` function.",
    disableInCLI: true,
    default: () => logger
  }
};
