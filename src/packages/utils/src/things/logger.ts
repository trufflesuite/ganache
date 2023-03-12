import { appendFile } from "fs";
import { promisify, format } from "util";
const appendFilePromise = promisify(appendFile);
export type LogFunc = (message?: any, ...optionalParams: any[]) => void;

type SyncronousLogger = {
  log: LogFunc;
};
type AsyncronousLogger = SyncronousLogger & {
  getCompletionHandle: () => Promise<void>;
};

export type Logger = SyncronousLogger | AsyncronousLogger;

export function createLogger(config: {
  file: number;
  baseLogger: Logger;
}): AsyncronousLogger;
export function createLogger(config: { baseLogger: Logger }): SyncronousLogger;
export function createLogger(config: {
  file?: number;
  baseLogger: Logger;
}): Logger {
  if (config.file === undefined) {
    return config.baseLogger;
  } else {
    if (typeof config.file !== "number") {
      throw new Error(
        `'config.file' was not correctly noramlized to a file descriptor. This should not happen. ${
          config.file
        }: ${typeof config.file}`
      );
    }
    const descriptor = config.file;

    const diskLogFormatter = (message: any) => {
      // trailing space after date is delimiter between date and message
      const linePrefix = `${new Date().toISOString()} `;
      return message.toString().replace(/^/gm, linePrefix);
    };

    let writing = Promise.resolve<void>(null);

    const log = (message: any, ...optionalParams: any[]) => {
      // we are logging to a file, but we still need to writing to console
      config.baseLogger.log(message, ...optionalParams);

      const formattedMessage: string = format(message, ...optionalParams);

      writing = writing.then(() => {
        return appendFilePromise(
          descriptor,
          diskLogFormatter(formattedMessage) + "\n"
        );
      });
    };
    return {
      log,
      getCompletionHandle: () => writing
    };
  }
}
