import { IPFS } from "ipfs";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
declare type IPFSChainOptions = Pick<
  FilecoinInternalOptions["chain"],
  "ipfsHost" | "ipfsPort"
>;
declare class IPFSServer {
  readonly options: IPFSChainOptions;
  node: IPFS | null;
  private httpServer;
  constructor(chainOptions: IPFSChainOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
}
export default IPFSServer;
