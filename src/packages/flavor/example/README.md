# My Chain

This is an example implementation of a ganache `flavor` plugin for a fictional
chain called "Not a BlockChain Chain".

To play with this example (which isn't published to npm). You'll need to
download this repository, run `npm i`, then `cd` to this `example/` directory,
run `npm i && npm run build`, and then you can use this folder as a ganache flavor.

## Usage

You can use Flavors via the CLI or progammatically from JavaScript.

### On the CLI

```console
$ ganache --flavor ~/code/ganache/src/packages/flavor/example --accounts david
```

### Programmatically

Just like with Ethereum Ganache, flavors can be instantiated as a provider, or
as a server.

#### As a provider

```javascript
import Ganache from "ganache";
import NotABlockchainChain from "./src/flavor";

const provider = Ganache.provider<NotABlockchainChain>({
  // note: flavors can be referenced by path or npm package name, but since
  // we are just running this locally without publishing we must use the
  // path (`__dirname`)
  flavor: __dirname as "not-a-blockchain-chain",
  wallet: {
    accounts: ["me", "you", "them"]
  }
});

console.log("Accounts: ", provider.getAccounts());

provider.send("sendFunds", ["me", "you", 99]).then(m => console.log(m));
```

#### As a server:

```javascript
import Ganache from "ganache";
import NotABlockchainChain from "./src/flavor";

const server = Ganache.server<NotABlockchainChain>({
  // note: flavors can be referenced by path or npm package name, but since
  // we are just running this locally without publishing we must use the
  // path (`__dirname`)
  flavor: __dirname as "not-a-blockchain-chain",
  wallet: {
    accounts: ["me", "you", "them"]
  }
});

server.listen(8888, () => {
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
