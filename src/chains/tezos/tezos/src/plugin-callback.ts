import { GanachePlugin } from "@ganache/options";
import { ServerOptions, TezosDefaults } from "@ganache/tezos-options";
import { Provider } from "..";

export const tezosCallback = (provider: Provider): any => {
  const accounts = provider.getInitialAccounts();
  const addresses = Object.keys(accounts);
  const oneTez = 10000000000;
  const accountsInfo = [];
  const privateKeys = [];
  addresses.forEach(function (address) {
    const account = accounts[address];
    const b = account.balance / oneTez;
    const rounded = Math.round(b);
    const symbol = rounded === b ? "" : "~";
    const line = `${account.name} ${symbol}${rounded} TEZ\n  pk: ${account.pk}\n  pkh: ${account.pkh}`;
    accountsInfo.push(line);
    const privateKey = `${account.sk.replace(/^unencrypted:/, "")} (${
      account.name
    })`;
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
    provider: TezosDefaults,
    server: {
      port: 8546,
      defaultServerOptions: {
        rpcEndpoint: {
          normalize,
          cliDescription:
            "Defines the endpoint route the HTTP and WebSocket servers will listen on.",
          default: () => {
            return "/tz";
          },
          defaultDescription: '"/tz" (Tezos)'
        },
        ws: undefined,
        wsBinary: undefined
      }
    }
  },
  callback: tezosCallback
};
