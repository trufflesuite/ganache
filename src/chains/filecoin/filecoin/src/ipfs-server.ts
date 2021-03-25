import path from "path";
import fs from "fs";

import { IPFS, create as createIPFS } from "ipfs";
import IPFSHttpServer from "ipfs-http-server";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";

type IPFSChainOptions = Pick<
  FilecoinInternalOptions["chain"],
  "ipfsHost" | "ipfsPort"
>;

type IPFSHttpServer = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

class IPFSServer {
  public readonly options: IPFSChainOptions;

  public node: IPFS | null;

  private httpServer: IPFSHttpServer | null;

  constructor(chainOptions: IPFSChainOptions) {
    this.options = chainOptions;
    this.node = null;
    this.httpServer = null;
  }

  async start(parentDirectory: string) {
    const folder = path.join(parentDirectory, "ganache-ipfs");
    if (!fs.existsSync(folder)) {
      await fs.promises.mkdir(folder);
    }

    this.node = await createIPFS({
      repo: folder,
      config: {
        Addresses: {
          Swarm: [], // No need to connect to the swarm
          // Note that this config doesn't actually trigger the API and gateway; see below.
          API: `/ip4/${this.options.ipfsHost}/tcp/${this.options.ipfsPort}`,
          Gateway: `/ip4/${this.options.ipfsHost}/tcp/9090`
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

    // remove all initial pins that IPFS pins automatically
    for await (const pin of this.node.pin.ls({ type: "recursive" })) {
      await this.node.pin.rm(pin.cid);
    }

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
