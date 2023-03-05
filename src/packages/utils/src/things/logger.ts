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
  quiet?: boolean;
  verbose?: boolean;
  baseLog: LogFunc;
}): AsyncronousLogger;
export function createLogger(config: {
  quiet?: boolean;
  verbose?: boolean;
  baseLog: LogFunc;
}): SyncronousLogger;
export function createLogger(config: {
  quiet?: boolean;
  file?: number;
  verbose?: boolean;
  baseLog: LogFunc;
}): Logger {
  const baseLog = config.quiet ? () => {} : config.baseLog;
  if (config.file === undefined) {
    return {
      log: baseLog
    };
  } else {
    if (typeof config.file !== "number") {
      throw new Error(
        `We didn't normalize the config.file to a descriptor correctly. Got ${config.file}.`
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
      baseLog(message, ...optionalParams);

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
