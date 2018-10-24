declare module "web3-provider-engine/subproviders/subprovider" {
  import {
    JSONRPCRequestPayload,
  } from "ethereum-protocol";
  import Web3ProviderEngine  from "web3-provider-engine";

  export class Subprovider {
    public setEngine(engine: Web3ProviderEngine): void;
    public handleRequest(payload: JSONRPCRequestPayload, next: () => void, end: () => void): void;
    public emitPayload(payload: JSONRPCRequestPayload, cb: () => void): void;
  }
  export default Subprovider;
}
