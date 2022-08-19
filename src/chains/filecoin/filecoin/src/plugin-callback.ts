import {
  Defaults,
  Definitions,
  GanachePlugin,
  OptionsConfig
} from "@ganache/options";
import { FilecoinDefaults } from "@ganache/filecoin-options";
import { FilecoinProvider } from "..";

export const filecoinCallback = async (provider: FilecoinProvider) => {
  const accounts = await provider.getInitialAccounts();
  const addresses = Object.keys(accounts);
  const accountsInfo: string[] = [];
  const privateKeys: string[] = [];
  const attoFILinFIL = 1000000000000000000n;

  addresses.forEach(function (address, index) {
    const balance = accounts[address].balance;
    const strBalance = balance / attoFILinFIL;
    const about = balance % attoFILinFIL === 0n ? "" : "~";
    let line = `(${index}) ${address} (${about}${strBalance} FIL)`;

    if (!accounts[address].unlocked) {
      line += " 🔒";
    }

    accountsInfo.push(line);

    const privateKey = `(${index}) ${accounts[address].secretKey}`;
    privateKeys.push(privateKey);
  });

  return {
    data: [
      {
        header: "Available Accounts",
        data: accountsInfo
      },
      {
        header: "Private Keys",
        data: privateKeys
      }
    ]
  };
};

const normalize = <T>(rawInput: T) => rawInput;

export const ganachePlugin: GanachePlugin = {
  options: {
    provider: FilecoinDefaults,
    server: {
      port: 7777
    }
  },
  callback: filecoinCallback
};

export type ServerConfig = {
  options: {
    /**
     * Defines the endpoint route the HTTP and WebSocket servers will listen on.
     *
     * @defaultValue "/"
     */
    readonly rpcEndpoint: {
      type: string;
      hasDefault: true;
    };
  };
};

export const serverOptions: Definitions<ServerConfig> = {
  rpcEndpoint: {
    normalize,
    cliDescription:
      "Defines the endpoint route the HTTP and WebSocket servers will listen on.",
    default: (_config: any, _flavor: any) => {
      return "/rpc/v0";
    },
    defaultDescription: '"fl" (Filecoin)'
  }
};

export type FilecoinServerConfig = {
  server: ServerConfig;
};

export const serverDefaults: Defaults<FilecoinServerConfig> = {
  server: serverOptions
};

export const serverOptionsConfig = new OptionsConfig(serverDefaults);
