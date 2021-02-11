declare module "ipfs-http-client" {
  type IPFSClientParameters = {
    host: string;
    port: number;
    protocol: "http" | "https";
    apiPath: string;
  };

  export type IPFSClient = {
    add(data: any): Promise<any>;
    get(string): Promise<any>;
  };

  type IPFSClientClass = (params: Partial<IPFSClientParameters>) => IPFSClient;

  export default IpfsHttpClient as IPFSClientClass;
}
