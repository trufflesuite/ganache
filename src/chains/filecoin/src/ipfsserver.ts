import { createServer, IPFSServer } from "ipfsd-ctl";
import path from "path";

const IpfsHttpClient: any = require("ipfs-http-client");
const JsIpfs: any = require("ipfs");

const IPFS_BIN = path.join(__dirname, "..", "node_modules", ".bin", "jsipfs"); 

let createIPFSServer = async(port:number):Promise<IPFSServer> => {
  let server = await createServer(port, {
    type: "js",
    ipfsBin: IPFS_BIN,
    disposable: true, // for now; will need to change with databasing
    ipfsHttpModule: IpfsHttpClient,
    ipfsModule: JsIpfs
  });

  return server;
}

export default createIPFSServer;
