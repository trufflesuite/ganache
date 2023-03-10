import { createReadStream, FSWatcher, watch } from "fs";
import { Readable } from "stream";
import * as readline from "readline";

export type LogsStreamOptions = Partial<{
  follow: boolean;
  since: number;
  until: number;
}>;

export function getLogsStream(
  path: string,
  options: LogsStreamOptions
): Readable {
  let logsStream: Readable;
  if (options.follow) {
    logsStream = createFollowReadStream(path);
  } else {
    logsStream = createReadStream(path);
  }
  if (options.since != null || options.until != null) {
    return filterLogsStream({
      input: logsStream,
      since: options.since,
      until: options.until
    });
  } else {
    return logsStream;
  }
}

export function filterLogsStream(args: {
  input: Readable;
  since?: number;
  until?: number;
}) {
  const { input, since, until } = args;

  if (since == null && until == null) {
    return input;
  } else {
    const outstream = new Readable({
      read: (size: number) => {}
    });

    const rl = readline.createInterface(input);

    rl.on("line", line => {
      if (since != null || until != null) {
        const date = Date.parse(line.substring(0, 24));
        if (
          (since == null || date >= since) &&
          (until == null || date <= until)
        ) {
          outstream.push(Buffer.from(`${line}\n`, "utf8"));
        }
      } else {
        outstream.push(Buffer.from(`${line}\n`, "utf8"));
      }
    });

    input
      .on("end", () => {
        outstream.emit("end");
      })
      .on("eof", () => {
        outstream.emit("eof");
      });
    return outstream;
  }
}

/**
 * Creates a {Readable} stream of data from the file specified by {filename}.
 * Continues to stream as data is appended to the file. Note: the file must be
 * written to append-only, updates to existing data will result in undefined
 * behaviour.
 * @param  {string} filename
 * @returns {Readable} a stream of the file
 */
export function createFollowReadStream(filename: string): Readable {
  let currentSize = 0;
  let directFileStream: Readable;
  let watcher: FSWatcher;

  const followStream = new Readable({
    // noop because the data is _pushed_ into `followStream`
    read: function (size: number) {}
  });

  function createStream() {
    directFileStream = createReadStream(filename, {
      start: currentSize
    })
      .on("data", data => {
        currentSize += data.length;
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

        //push the chunk into `followStream`'s internal buffer
        followStream.push(chunk);
      })
      .on("end", () => {
        directFileStream.destroy();
        followStream.emit("eof");
        watcher = watch(filename, () => {
          watcher.close();
          createStream();
        });
      })
      .on("error", err => followStream.emit("error", err));
  }
  createStream();

  return followStream;
}
