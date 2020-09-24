import { Definitions } from "@ganache/options";

export type LoggingConfig = {
  options: {
    /**
     * Set to `true` to log EVM opcodes.
     * 
     * Defaults to `false`.
     */
    readonly debug: {
      type: boolean;
      hasDefault: true;
    }

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
      type: {
        log(message?: any, ...optionalParams: any[]): void;
      };
      hasDefault: true;
    }

    /**
     * Set to `true` to log all RPC requests and responses.
     * 
     * Defaults to `false`.
     */
    readonly verbose: {
      type: boolean;
      hasDefault: true;
    }
  },
  exclusiveGroups: []
}

const logger = { log: console.log.bind(console) };

export const LoggingOptions: Definitions<LoggingConfig> = {
  debug: {
    normalize: rawInput => rawInput,
    default: () => false
  },
  logger: {
    normalize: rawInput => rawInput,
    default: () => logger
  },
  verbose: {
    normalize: rawInput => rawInput,
    default: () => false
  }
};
