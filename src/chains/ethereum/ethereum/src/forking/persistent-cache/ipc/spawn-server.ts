import { join } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { Server } from "./server";

(async function () {
  const logFile = join(tmpdir(), "ganache-out.log");
  const out = createWriteStream(logFile, { flags: "a" });
  // write errors to the log file
  process.stderr.write = out.write.bind(out);

  const server = new Server(process.argv[2] || "ganache-persistence");
  await server.initialize();

  console.log("server started");
  // Now that we've sent the message, write stdout to the log file as well
  process.stdout.write = out.write.bind(out);
})();
