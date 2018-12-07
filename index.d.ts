declare module 'ganache-core' {
  import {Provider as Web3Provider} from 'web3/providers';
  import * as http from 'http';

  namespace Ganache {
    type ProviderArgs = Partial<{
      accounts: {
        balance: string,
        secretKey?: string,
      }[]
      debug: boolean,
      blockTime: number,
      logger: {
        log: (message?: any, ...optionalParams: any[]) => void
      },
      mnemonic: string,
      port: number,
      seed: string,
      default_balance_ether: number,
      total_accounts: number,
      fork: string|Web3Provider
      fork_block_number: string|number
      network_id: number,
      time: Date,
      locked: boolean,
      unlocked_accounts: (string|number)[],
      db_path: string,
      db: object,
      ws: boolean,
      vmErrorsOnRPCResponse: boolean,
      hdPath: string,
      allowUnlimitedContractSize: boolean,
      gasPrice: string, // 2 gwei
    }>;

    type ServerArgs = Partial<ProviderArgs & {
      keepAliveTimeout: number,
    }>

    export function provider(obj: ProviderArgs): Web3Provider;
    export function server(obj: ServerArgs): http.Server;
  }

  export = Ganache
}
