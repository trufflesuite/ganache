declare module "ipfsd-ctl" {
  export interface IPFSNodeParameters {
    type: "js", 
    ipfsBin: string,
    test: boolean,
    disposable: boolean,
    ipfsHttpModule: any,
    ipfsModule: any
  }

  export interface IPFSNode {
    apiAddr: {
      toString(): string;
    };
    stop(): Promise<void>;
  }

  export interface IPFSServer {
    start():void;
    stop():Promise<void>;
  }

  type CreateServer = (port:number, params:Partial<IPFSNodeParameters>) => Promise<IPFSServer>;
  type CreateController = (params:Partial<IPFSNodeParameters>) => Promise<IPFSNode>;

  let createServer:CreateServer;
  let createController:CreateController;
}