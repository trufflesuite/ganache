import { fork } from "child_process";
import net from "net";
import { BUFFER_ZERO, Quantity } from "@ganache/utils";
import envPaths from "env-paths";
import levelup from "levelup";
import type { LevelUp } from "levelup";
import leveldown from "leveldown";
import sub from "subleveldown";
import encode from "encoding-down";
import fs from "fs";
const { unlink } = fs.promises;
import { promises } from "fs";
import { resolveTargetAndClosestAncestor, setDbVersion } from "../helpers";
import { AbstractBatch } from "abstract-leveldown";
import { Socket } from "net";
import path from "path";
import {
  decodeMessage,
  encodeMessage,
  makeIpcPath,
  Message,
  Method
} from "./helpers";

const { mkdir } = promises;

const levelupOptions = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
const leveldownOpts = { prefix: "" };

let id: bigint = 0n;

export class Server {
  private readonly ipc: net.Server;
  private readonly serverId: string;
  public readonly version = BUFFER_ZERO;
  private readonly connections: Set<Socket> = new Set();

  private db: LevelUp;
  private cacheDb: LevelUp;
  private ancestorDb: LevelUp;

  static async spawnInDisconnectedProcess(serverId: string) {
    return new Promise(resolve => {
      const child = fork(
        // "node",
        path.join(__dirname, "start-server"),
        [serverId],
        {
          detached: true,
          stdio: ["ipc"]
        }
      );
      const signal = Buffer.from("\nserver started", "utf8");
      let buf = Buffer.allocUnsafe(0);
      child.stdout.on("data", data => {
        buf = Buffer.concat([buf, data]);
        if (buf.indexOf(signal) !== -1) {
          buf = null;
          child.unref();
          resolve(void 0);
        }
      });
    });
  }

  constructor(serverId: string) {
    this.ipc = net.createServer();
    this.serverId = makeIpcPath(serverId);
  }

  private shutdownTimeout = 1000;
  private shutdownTimer: NodeJS.Timeout | null = null;

  public async initialize() {
    const { data: directory } = envPaths("Ganache/db", { suffix: "" });

    console.log(`mkdir ${directory}`);
    await mkdir(directory, { recursive: true });

    const store = encode(leveldown(directory, leveldownOpts), levelupOptions);
    this.db = levelup(store);

    console.log(`opening database`);
    await this.db.open();

    console.log(`setting db version ${this.version}`);
    await setDbVersion(this.db, this.version);

    this.cacheDb = sub(this.db, "c", levelupOptions);

    console.log(`opening cacheDb`);
    await this.cacheDb.open();
    this.ancestorDb = sub(this.db, "a", levelupOptions);

    console.log(`opening ancestorDb`);
    await this.ancestorDb.open();

    console.log(`unlink existing server, ${this.serverId}, if exists`);
    await unlink(this.serverId).catch(e => {});

    await new Promise(resolve => {
      console.log(`starting IPC server at ${this.serverId}`);
      this.ipc
        .listen(this.serverId, () => {
          console.log(`IPC server started`);
          // if no sockets connect within 5 seconds shutdown automatically
          this.shutdownTimer = setTimeout(() => {
            console.log(
              `shutting down do to no socket connections after 5 seconds`
            );
            this.ipc.close();
          }, 5000);
          resolve(void 0);
        })
        .on("connection", socket => {
          clearTimeout(this.shutdownTimer);

          console.log(`new socket connected`);
          this.connections.add(socket);
          socket.on("data", async (data: Message) => {
            console.log(`received message`);
            const { method, id, params } = decodeMessage(data);

            console.log(`message method: ${method}`);
            console.log(`message id: ${id}`);

            switch (method) {
              case Method.response:
                const callback = this.registry.get(id.toString("hex"));
                if (callback) {
                  this.registry.delete(id.toString("hex"));
                  return void callback(params);
                }
                break;
              case Method.resolveTargetAndClosestAncestor:
                const response = await this.resolveTargetAndClosestAncestor(
                  socket,
                  params[0] as Buffer,
                  params[1] as Buffer
                );
                socket.write(encodeMessage(Method.response, id, response));
                break;
            }
          });
          socket.on("close", () => {
            console.log("socket closed");

            this.connections.delete(socket);
            if (this.connections.size === 0) {
              this.shutdownTimer = setTimeout(() => {
                console.log("shutting down due to zero connections remaining");
                this.ipc.close();
              }, this.shutdownTimeout);
            }
          });
        });
    });
  }

  public async resolveTargetAndClosestAncestor(
    socket: Socket,
    targetHeight: Buffer,
    targetHash: Buffer
  ) {
    const results = await resolveTargetAndClosestAncestor(
      this.ancestorDb,
      this.request.bind(this, socket) as any,
      Quantity.from(targetHeight),
      Quantity.from(targetHash)
    );
    return [
      results.closestAncestor.key,
      results.closestAncestor.serialize(),
      results.targetBlock.key,
      results.targetBlock.serialize()
    ];
  }

  private registry: Map<string, any> = new Map<string, any>();
  async request(socket: Socket, method: keyof typeof Method, params: any[]) {
    id++;
    const localId = Buffer.from("client-" + id, "utf8");
    return new Promise<any>(resolve => {
      this.registry.set(localId.toString("hex"), resolve);
      socket.write(
        encodeMessage(
          Method[method],
          localId,
          Buffer.from(JSON.stringify(params), "utf8")
        )
      );
    });
  }
}
