import IpfsHttpClient from "ipfs-http-client";
import IPFSServer from "../../src/ipfsserver";

export default () => {
  return IpfsHttpClient({
    host: "localhost",
    port: IPFSServer.DEFAULT_PORT,
    protocol: "http"
  });
}