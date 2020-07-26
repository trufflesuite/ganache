declare module "ipfs-http-client" {
  type IPFSClientParameters = {
    host: string;
    port: number;
    protocol: "http" | "https";
    apiPath: string;
  }

  type IPFSClient = {
    add(data:any):Promise<any>;
    get(string):Promise<any>;
  }

  type IPFSClientClass = (params:IPFSClientParameters) => IPFSClient;

  export default IpfsHttpClient as IPFSClientClass;
}