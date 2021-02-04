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
  readonly serverPort: number;
  readonly apiPort: number;
  node: IPFSNode | null;
  private httpServer;
  constructor(apiPort: number);
  start(): Promise<void>;
  stop(): Promise<void>;
}
export default IPFSServer;
