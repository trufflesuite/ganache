import { Provider } from "@ganache/filecoin";

export default function (
  provider: Provider,
  serverSettings: { host: string; port: number }
) {
  const liveOptions = provider.getOptions();
  const accounts = provider.getInitialAccounts();

  console.log("");
  console.log("Available Accounts");
  console.log("==================");

  const addresses = Object.keys(accounts);

  addresses.forEach(function (address, index) {
    const balance = accounts[address].balance;
    let line = `(${index}) ${address} (${balance} FIL)`;

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
    `Lotus API started on ${serverSettings.host}:${serverSettings.port}`
  );
  console.log(
    `IPFS  API started on ${liveOptions.chain.ipfsHost}:${liveOptions.chain.ipfsPort}`
  );
}
