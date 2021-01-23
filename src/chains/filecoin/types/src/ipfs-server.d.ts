export declare type IPFSNode = {
  apiAddr: {
    toString(): string;
  };
  stop(): Promise<void>;
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
declare class IPFSServer {
  static readonly DEFAULT_PORT = 5001;
  readonly serverPort = 43134;
  readonly apiPort = 5001;
  node: IPFSNode;
  private httpServer;
  constructor(apiPort: any);
  start(): Promise<void>;
  stop(): Promise<void>;
}
export default IPFSServer;
