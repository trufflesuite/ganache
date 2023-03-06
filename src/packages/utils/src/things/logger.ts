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
  baseLog: LogFunc;
}): AsyncronousLogger;
export function createLogger(config: { baseLog: LogFunc }): SyncronousLogger;
export function createLogger(config: {
  file?: number;
  baseLog: LogFunc;
}): Logger {
  if (config.file === undefined) {
    return {
      log: config.baseLog
    };
  } else {
    if (typeof config.file !== "number") {
      throw new Error(
        "`config.file` was not correctly noramlized to a file descriptor. This should not happen."
      );
    }
    const descriptor = config.file as number;

    const diskLogFormatter = (message: any) => {
      const linePrefix = `${new Date().toISOString()} `;
      return message.toString().replace(/^/gm, linePrefix);
    };

    let writing = Promise.resolve<void>(null);

    const log = (message: any, ...optionalParams: any[]) => {
      // we are logging to a file, but we still need to writing to console
      config.baseLog(message, ...optionalParams);

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
