declare module "ganache-core" {
  import { Provider as Web3Provider } from "web3/providers";
  import { Server as HttpServer } from "http";

  namespace Ganache {
    export interface IProviderOptions {
      account_keys_path?: string;
      accounts?: object[];
      allowUnlimitedContractSize?: boolean;
      blockTime?: number;
      db_path?: string;
      debug?: boolean;
      default_balance_ether?: number;
      fork?: string | object;
      fork_block_number?: string | number;
      forkCacheSize?: number;
      gasLimit?: string | number;
      gasPrice?: string;
      hardfork?: "byzantium" | "constantinople" | "petersburg" | "istanbul" | "muirGlacier";
      hd_path?: string;
      locked?: boolean;
      logger?: {
        log(msg: string): void;
      };
      mnemonic?: string;
      network_id?: number;
      networkId?: number;
      port?: number;
      seed?: any;
      time?: Date;
      total_accounts?: number;
      unlocked_accounts?: string[];
      verbose?: boolean;
      vmErrorsOnRPCResponse?: boolean;
      ws?: boolean;
    }

    export interface IServerOptions extends IProviderOptions {
      keepAliveTimeout?: number;
    }

    export function provider(opts?: IProviderOptions): Provider;
    export function server(opts?: IServerOptions): Server;

    export interface Server extends HttpServer {
      provider: Provider
    }

    export interface Provider extends Web3Provider {
      close: (callback: Function) => void;
    }
  }
  export default Ganache;
}
