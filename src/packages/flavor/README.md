# `@ganache/flavor`

Ganache's flavor TypeScript types and utils.

Ganache Flavors are plugins that can be used to launch test networks for chains
other than Ethereum. They are loaded at runtime via Ganache's `--flavor` flag.

To create a new flavor, you must create a new package that exports a `Flavor`. A
flavor is a class that implements the `Flavor` TypeScript interface.

Here is an example of a complete flavor implementation:

```typescript
import type { Connector, Flavor } from "@ganache/flavor";

class Provider {
  #accounts = new Map();
  constructor(options) {
    options.addresses.forEach(address => {
      this.#accounts.set(address, {
        balance: options.defaultBalance
      });
    });
  }

  send(method: string, params: any[]) {
    switch (method) {
      case "sendFunds":
        const [from, to, amount] = params;
        const fAccount = accounts.get(from) || { balance: 0n };
        const tAccount = accounts.get(to) || { balance: 0n };
        if (fAccount.balance < amount) {
          throw new Error("insufficient funds");
        }

        fAccount.balance -= amount;
        tAccount.balance += amount;

        accounts.set(from, fAccount);
        accounts.set(to, tAccount);
      default:
        throw new Error("Unsupported method " + method);
    }
  }
}

class MyChainConnector<Provider> implements Connector<Provider, any, any> {
  constructor(options, _executor: Executor) {
    this.provider = new Provider(options);
  }
  public provider: Provider;
  public async connect() {}
  public parse(message: Buffer): RequestFormat {
    return JSON.stringify();
  }
  public handle(payload: RequestFormat, connection: HttpRequest) {
    await this.provider.send(payload.method, payload.params);
  }
  public format() {}
  public formatError() {}
  public close() {}
}

function initialize(provider: Provider, cliArgs: any) {
  console.log(`Server is running at ${cliArgs.host}:${cliArgs.port}`);
}

interface MyChainConnector extends Flavor<Provider, DefaultOptions> {
  flavor: "my-chain";
  Connector: typeof MyChainConnector;
  initialize: typeof initialize;
  defaults: Defaults;
}
export default MyChainConnector;
```
