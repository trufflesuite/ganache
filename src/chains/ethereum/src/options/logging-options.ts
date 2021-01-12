import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type Logger = {
  log(message?: any, ...optionalParams: any[]): void;
};

export type LoggingConfig = {
  options: {
    /**
     * Set to `true` to log EVM opcodes.
     *
     * @default false
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
     * Set to `true` to log all RPC requests and responses.
     *
     * @default false
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
  };
};

const logger: Logger = { log: () => {} };

export const LoggingOptions: Definitions<LoggingConfig> = {
  debug: {
    normalize,
    default: () => false,
    legacyName: "debug"
  },
  logger: {
    normalize,
    default: () => logger,
    legacyName: "logger"
  },
  verbose: {
    normalize,
    default: () => false,
    legacyName: "verbose"
  }
};
