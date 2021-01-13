import path from "path";
import fs from "fs";
import os from "os";

import { IPFS, create as createIPFS } from "ipfs";
import IPFSHttpServer from "ipfs-http-server";

type IPFSHttpServer = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

class IPFSServer {
  static readonly DEFAULT_PORT = 5001;

  public readonly apiPort: number = IPFSServer.DEFAULT_PORT;

  public node: IPFS | null;

  private httpServer: IPFSHttpServer | null;

  constructor(apiPort: number) {
    this.apiPort = apiPort;
    this.node = null;
    this.httpServer = null;
  }

  async start() {
    // Uses a temp folder for now.
    const folder: string = await new Promise((resolve, reject) => {
      fs.mkdtemp(path.join(os.tmpdir(), "foo-"), (err, folder) => {
        if (err) {
          return reject(err);
        }
        resolve(folder);
      });
    });

    this.node = await createIPFS({
      repo: folder,
      config: {
        Addresses: {
          Swarm: [], // No need to connect to the swarm
          // Note that this config doesn't actually trigger the API and gateway; see below.
          API: `/ip4/127.0.0.1/tcp/${this.apiPort}`,
          Gateway: `/ip4/127.0.0.1/tcp/9090`
        },
        Bootstrap: [],
        Discovery: {
          MDNS: {
            Enabled: false
          },
          webRTCStar: {
            Enabled: false
          }
        },
        // API isn't in the types, but it's used by ipfs-http-server
        // @ts-ignore
        API: {
          HTTPHeaders: {
            "Access-Control-Allow-Origin": ["*"],
            "Access-Control-Allow-Credentials": "true"
          }
        }
      },
      start: true,
      silent: true
    });

    this.httpServer = new IPFSHttpServer(this.node) as IPFSHttpServer;

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
