import { open, FileHandle } from "fs/promises";
import { format } from "util";

export type LogFunc = (message?: any, ...optionalParams: any[]) => void;

/**
 * Create a logger function based on the provided config.
 *
 * @param config specifying the configuration for the logger
 * @returns an object containing a `log` function and optional `getCompletionPromise`
 * function returning a `Promise<void>` that resolves when any asyncronous
 * activies are completed.
 */
export function createLogger(config: { baseLog: LogFunc; file: string }): {
  log: LogFunc;
  getCompletionPromise: () => Promise<void>;
  close: () => Promise<void>;
};
export function createLogger(config: { baseLog: LogFunc }): { log: LogFunc };
export function createLogger(config: { baseLog: LogFunc; file?: string }): {
  log: LogFunc;
  getCompletionPromise?: () => Promise<void>;
  close?: () => Promise<void>;
} {
  if ("file" in config) {
    const diskLogFormatter = (message: any) => {
      const linePrefix = `${new Date().toISOString()} `;
      return message.toString().replace(/^/gm, linePrefix);
    };

    // we pass this handle back out so that it can be closed by the caller
    const whenHandle = open(config.file, "a");

    let writing = Promise.resolve<void>(null);

    const log = (message: any, ...optionalParams: any[]) => {
      // we are logging to a file, but we still need to call the base logger
      config.baseLog(message, ...optionalParams);

      const formattedMessage = format(message, ...optionalParams);
      const currentWriting = writing;
      writing = whenHandle.then(async handle => {
        await currentWriting;

        return handle.appendFile(diskLogFormatter(formattedMessage) + "\n");
      });
    };

    return {
      log,
      getCompletionPromise: () => writing,
      close: async () => (await whenHandle).close()
    };
  } else {
    return {
      log: config.baseLog
    };
  }
}
