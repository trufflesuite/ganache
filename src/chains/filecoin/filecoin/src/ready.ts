import { CliSettings } from "@ganache/flavor";
import { FilecoinProvider } from "./provider";

export type ready = typeof ready;

export async function ready({
  provider,
  options
}: {
  provider: FilecoinProvider;
  options: { server: CliSettings };
}) {
  const liveOptions = provider.getOptions();
  const accounts = await provider.getInitialAccounts();

  console.log("");
  console.log("Available Accounts");
  console.log("==================");

  const addresses = Object.keys(accounts);
  const attoFILinFIL = 1000000000000000000n;

  addresses.forEach(function (address, index) {
    const balance = accounts[address].balance;
    const strBalance = balance / attoFILinFIL;
    const about = balance % attoFILinFIL === 0n ? "" : "~";
    let line = `(${index}) ${address} (${about}${strBalance} FIL)`;

    if (!accounts[address].unlocked) {
      line += " 🔒";
    }

    console.log(line);
  });

  console.log("");
  console.log("Private Keys");
  console.log("==================");

  addresses.forEach(function (address, index) {
    console.log(`(${index}) ${accounts[address].secretKey}`);
  });

  console.log("");
  console.log(
    `Lotus RPC listening on ${options.server.host}:${options.server.port}`
  );
  console.log(
    `IPFS RPC listening on ${liveOptions.chain.ipfsHost}:${liveOptions.chain.ipfsPort}`
  );
}
