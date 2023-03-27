import { createWriteStream } from "fs";
import { format } from "util";
export type LogFunc = (message?: any, ...optionalParams: any[]) => void;

export type Logger = {
  log: LogFunc;
};

export type InternalLogger = Logger & {
  close?: () => Promise<void>;
};

type LoggerConfig = {
  baseLogger: Logger;
  file?: number;
  onError?: (err: Error) => void;
};

export function createLogger(config: LoggerConfig): InternalLogger {
  const baseLog = (...params: any[]) => config.baseLogger.log(...params);

  if ("file" in config && config.file !== undefined) {
    if (typeof config.file !== "number") {
      throw new Error(
        `'config.file' was not correctly normalized to a file descriptor. This should not happen. Value: ${
          config.file
        } of type ${typeof config.file}`
      );
    }
    const fd = config.file;

    const diskLogFormatter = (message: any) => {
      // trailing space after date is delimiter between date and message
      const linePrefix = `${new Date().toISOString()} `;
      return message.toString().replace(/^/gm, linePrefix);
    };

    const writeStream = createWriteStream(null, { fd });

    const onError =
      config.onError ||
      (err => console.error(`Error writing to log file: ${err.message}`));
    writeStream.on("error", onError);

    const log = (message: any, ...optionalParams: any[]) => {
      // we are logging to a file, but we still need to writing to console
      baseLog(message, ...optionalParams);

      const formattedMessage: string = format(message, ...optionalParams);
      writeStream.write(diskLogFormatter(formattedMessage) + "\n");
    };

    return {
      log,
      close: () =>
        new Promise<void>((resolve, reject) => {
          writeStream.close(err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        })
    };
  } else {
    return {
      log: baseLog,
      close: async () => {}
    };
  }
}
