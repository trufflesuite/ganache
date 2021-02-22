import { Provider } from "@ganache/tezos";
import { CliSettings } from "../types";

export default function (provider: Provider, cliSettings: CliSettings) {
  const accounts = provider.getInitialAccounts();

  const addresses = Object.keys(accounts);

  const oneTez = 10000000000;

  console.log("");
  console.log("Available Accounts");
  console.log("==================");
  addresses.forEach(function (address) {
    const account = accounts[address];
    const b = account.balance / oneTez;
    const rounded = Math.round(b);
    const symbol = rounded === b ? "" : "~";
    const line = `${account.name} ${symbol}${rounded} TEZ\n  pk: ${account.pk}\n  pkh: ${account.pkh}`;
    console.log(line);
  });

  console.log("");
  console.log("Private Keys");
  console.log("==================");
  addresses.forEach(function (address) {
    const account = accounts[address];
    console.log(`${account.sk.replace(/^unencrypted:/, "")} (${account.name})`);
  });

  console.log("");
  console.log("Listening on " + cliSettings.host + ":" + cliSettings.port);
}
