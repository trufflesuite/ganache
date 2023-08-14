import { createWriteStream } from "fs";
import { format } from "util";
import { EOL } from "os";

export type LogFunc = (message?: any, ...optionalParams: any[]) => void;

export type Logger = {
  log: LogFunc;
};

export type InternalLogger = Logger & {
  close: () => Promise<void>;
};

type LoggerConfig = {
  baseLogger: Logger;
  file?: number;
};

// this needs to match start of line with both CRLF and LF encoding (^ matches after _both_ CR and LF)
const START_OF_LINE = /^|(?<=\r?\n)/g;

export function createLogger(config: LoggerConfig): InternalLogger {
  const baseLog = (...params: any[]) => config.baseLogger.log(...params);

  if ("file" in config && config.file !== undefined) {
    const fd = config.file;

    const diskLogFormatter = (message: string) => {
      // trailing space after date is delimiter between date and message
      const linePrefix = `${new Date().toISOString()} `;
      return message.replace(START_OF_LINE, linePrefix);
    };

    const writeStream = createWriteStream(null, { fd });

    const onError = err =>
      console.error(`Error writing to log file: ${err.message}`);
    writeStream.on("error", onError);

    const log = (message: any, ...optionalParams: any[]) => {
      // we are logging to a file, but we still need to write to console
      baseLog(message, ...optionalParams);

      const formattedMessage: string = format(message, ...optionalParams);
      writeStream.write(diskLogFormatter(formattedMessage) + EOL);
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
