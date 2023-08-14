# Not-a-Blockchain-Chain

This is an example implementation of a ganache `flavor` plugin for a fictional
chain called "Not-a-Blockchain-Chain".

To play with this example (which isn't published to npm). You'll need to
download this repository, run `npm i`, then `cd` to this `example/` directory,
run `npm i && npm run build`, and then you can use this folder as a ganache flavor.

## Usage

You can use Flavors via the CLI or progammatically from JavaScript.

### On the CLI

```console
$ ganache --flavor ~/code/ganache/packages/flavor/example --accounts david
```

### Programmatically

Just like with Ethereum Ganache, flavors can be instantiated as a provider, or
as a server.

#### As a provider

```typescript
import Ganache from "ganache";
import NotABlockchainChain from "./src/flavor";

// `provider` is the NotABlockchainChain flavor's `provider`.
const provider = Ganache.provider<NotABlockchainChain>({
  // note: flavors can be referenced by path or npm package name, but since
  // we are running directly from this folder without publishing to npm we must
  // use the path (`__dirname`) and cast to make TypeScript happy.
  flavor: __dirname as "not-a-blockchain-chain",
  // provider options are defined by the flavor
  wallet: {
    // our blockchain is silly and let's you create accounts out of any string
    // you'd like. This accounts will be funded on start up.
    accounts: ["me", "you", "them"]
  }
});

console.log("Accounts: ", provider.getAccounts());

provider.send("sendFunds", ["me", "you", 99]).then(m => console.log(m));
```

#### As a server:

```typescript
import Ganache from "ganache";
import NotABlockchainChain from "./src/flavor";

// server is an instance of a Ganache `server`.
const server = Ganache.server<NotABlockchainChain>({
  // note: flavors can be referenced by path or npm package name, but since
  // we are running directly from this folder without publishing to npm we must
  // use the path (`__dirname`) and cast to make TypeScript happy.
  flavor: __dirname as "not-a-blockchain-chain",
  // server options are a mix of Ganache defaults (like `server.websockets`,
  // `server.wsBinary`, `server.rpcEndpoint`, and `server.chunkSize`; run
  // `ganache --help` for details), blended with the flavor's `server` defaults,
  // plus the flavor's `provider` defaults
  server: {
    rpcEndpoint: "/rpc"
  },
  wallet: {
    // our blockchain is silly and let's you create accounts out of any string
    // you'd like. This accounts will be funded on start up.
    accounts: ["me", "you", "them"]
  }
});

// start up NotABlockchainChain RPC on port 8888
server.listen(8888, () => {
  // `provider` is the NotABlockchainChain flavor's `provider`.
  const provider = server.provider;

  console.log("Chain started");
  console.log("=============");
  console.log("Accounts: ", provider.getAccounts());
  console.log();
  console.log("Server listening on port 8888");

  // NOTE: to programmatically gracefully close the `server` you should call
  // `await server.close();` before exiting the process
});
```
