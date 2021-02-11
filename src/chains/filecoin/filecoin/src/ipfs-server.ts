import path from "path";
import fs from "fs";
import os from "os";

const JsIpfs: any = require("ipfs");
const IpfsHttpApi: any = require("ipfs/src/http");

export type IPFSNode = {
  apiAddr: {
    toString(): string;
  };
  stop(): Promise<void>;

  // API endpoints used

  add(
    data: any
  ): Promise<{
    path: string;
  }>;

  object: {
    stat(
      key: string,
      options: any
    ): Promise<{
      BlockSize: number;
      CumulativeSize: number;
      DataSize: number;
      Hash: string;
      LinksSize: number;
      NumLinks: number;
    }>;
  };
};

type IPFSHttpServer = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

class IPFSServer {
  static readonly DEFAULT_PORT = 5001;

  public readonly serverPort: number = 43134;
  public readonly apiPort: number = IPFSServer.DEFAULT_PORT;

  public node: IPFSNode | null;

  private httpServer: IPFSHttpServer | null;

  constructor(apiPort: number) {
    this.apiPort = apiPort;
    this.node = null;
    this.httpServer = null;
  }

  async start() {
    // Uses a temp folder for now.
    let folder = await new Promise((resolve, reject) => {
      fs.mkdtemp(path.join(os.tmpdir(), "foo-"), (err, folder) => {
        if (err) {
          return reject(err);
        }
        resolve(folder);
      });
    });

    this.node = await JsIpfs.create({
      repo: folder,
      config: {
        Addresses: {
          Swarm: [], // No need to connect to the swarm
          // Note that this config doesn't actually trigger the API and gateway; see below.
          API: `/ip4/127.0.0.1/tcp/${this.apiPort}`,
          Gateway: `/ip4/127.0.0.1/tcp/9090`
        },
        Bootstrap: []
      },
      start: true,
      silent: true
    });

    this.httpServer = new IpfsHttpApi(this.node) as IPFSHttpServer;

    await this.httpServer.start();
  }

  async stop() {
    if (this.httpServer) {
      await this.httpServer.stop();
    }
    if (this.node) {
      await this.node.stop();
    }
  }
}

export default IPFSServer;
