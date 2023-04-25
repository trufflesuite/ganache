# `@ganache/flavor`

Ganache's flavor TypeScript types, helpers, and utility functions.

Ganache Flavors are plugins that can be used to launch test networks for chains
other than Ganache's built-in Ethereum networks. They are loaded at runtime via
Ganache's `--flavor` flag.

### Warnings and Gotchas

Ganache flavors are experiemental, incomplete, and subject to change without
notice.

Ganache flavors are Ethereum JSON-RPC (2.0) inspired, and we are still working
to understand the needs of other chains and how to extend the Ganache flavor
model to support transports other than JSON-RPC 2.0 over HTTP/WS.

An example of shortcomings for non JSON-RPC chains:

- ganache only accepts POST requests over a single configurable path (defaults
  to `/`). If you have a need for something else, like JSON over REST, gRPC, SOAP,
  etc, please open an issue describing your use case.
- websocket subscription-based messaging is very limited and only supports
  responsing like Ethereum JSON-RPC does.

### How to create an experimental ganache flavor

To create a new flavor, you must create a new package that exports a `Flavor`. A
flavor is a JavaScript object that implements the `Flavor` TypeScript interface.

A hello-world flavor in TypeScript:

````typescript
import type { Flavor } from "@ganache/flavor";

const helloConnector: Connector = {
  // the `provider` is yours to implement however you'd like
  provider: {
    sayHi(name: string) {
        return `Hello, ${name}`;
    }
  },

  async connect() {
    // ganache will `await` the return of your `connect` method before
    // forwarding any requests to your connector.
    // if your connector doesn't need to do any async work to initialize you
    // can leave this empty.
  },

  parse(message: Buffer) {
    // the `message` doesn't have to be JSON, you can implement any transport
    // you want.
    return JSON.parse(message);
  }

  async handle(payload: {name: string}) {
    if (!payload || typeof payload.name !== "string") {
        // you can throw here and ganache will catch the error and pass it to
        // your `formatError` function.
        throw new Error("payload must have a `name` property of type `string`");
    }

    // in our example we only support
    const value = this.provider.sayHi(payload.name);
    // `handle` must always return any object with a `value` property.
    // The value of `value` may itself be a `Promise`. The _resolved_ `value`
    // will be passed to your connector's `format` function.
    //
    // NOTE: if the `value` is a `PromiEvent` (a `Promise` that also has an `on`
    // function) that emits a `"message"` event then Ganache will subscribe to
    // the `"message"` event and will emit a JSON-RPC 2.0 style message to the
    // client that sent the original request. You cannot currently `format` this
    // message. This behavior will change in the future without notice. It is
    // not recommened that you use the PromiEvent feature at this time.
    return { value };
  }

  format(result, payload) {
    console.log(`formatting result (${result}) for payload (${payload})`);
    // You don't have to return a string here, you can also return a Buffer
    // and the serialization doesn't have to be JSON.
    //
    // NOTE: ganache flavors don't support changing the `content-type` header
    // so it always returns `content-type: application/json`. This will change
    // in the future and flavors will be able to specify their own content-type
    // and other HTTP headers.
    //
    // You can also return a Generator (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)
    // and ganache will send the response in chunks. This is useful if your
    // response data is too large for Node.js to handle (string and Buffer sizes
    // are limited to about 1-2GB, and memory is capped to 4GB on most systems).
    return JSON.stringify({ result });
  }

  formatError(err, payload) {
    // Ganache calls your `formatError` if any errors occured while processing
    // a request.
    // NOTE: In the case that your connector's `parse` throws, Ganache does
    // _not_ call `formatError` and returns a `400 Bad Request` response.

    console.log(`formatting error (${err.message}) for payload (${payload})`);
    // you don't have to return a string here, you can also return a Buffer
    // and the serialization doesn't have to be JSON
    return JSON.stringify({ error: error.message });
  }

  async close() {
    // ganache calls your connector's `close` function when shutting down.
    // This is where you'd do any clean up, like closing database connections
    // or cleaning temporary files.
  }
};

type HelloFlavor = Flavor<"hello-world", typeof helloConnector>;

const HelloFlavor: HelloFlavor = {
  flavor: "hello-chain",
  options: {
    // see the `example/` directory for how Options work
  },
  connect: (options: {}, executor: Executor) => {
    // NOTE: about the `Executor`
    // The `executor` is an helper class that can be used to coordinate request
    // execution. This help is an internal abstraction that might be useful, so
    // it has been provided as part of this flavor interface.
    //
    // You can use it by calling `executor.execute(api, functionToCall, params)`
    // from your `handle` function instead of calling the function itself
    // directly.
    //
    // If a function with the name `functionToCall` exists on the
    // `api` it will be called with the given `params`, otherwise it will error
    // with `The method ${String(methodName)} does not exist/is not available`.
    //
    // If your provider options includes a boolean option named
    // `asyncRequestProcessing` or `chain.asyncRequestProcessing` then the
    // executor will allow only 1 request to be processed at a time (only useful
    // if you want to ignore race conditions that can arise from attempting to
    // handle multiple simultaneous requests).
    //
    // Lastly, if you use the executor to process your requests you can use it
    // in your `close` function to safely coordinate shutdown as follows:
    // ```
    // async close() {
    //   // prevent new requests from being passed to the api, requests that
    //   // have already started are not rejected.
    //   executor.stop();
    //
    //   await closeDatabaseAndOtherThings();
    //
    //   // alternatively, or additionally, you can use `executor.end()` to
    //   // reject any requests that have started processing but haven't yet
    //   // finished:
    //   // executor.stop();
    //   // await closeDatabaseAndOtherThings();
    //   // executor.end();
    // }
    //

    return helloConnector;
  },
  ready
};
/**
 * Your flavor needs to be exported as `default` so Ganache can find it.
 */
export default HelloFlavor;

async function ready(provider: Provider, cliArgs: CliSettings) {
  // this function is only called after ganache has fully initialized, and is
  // only called when used via ganache cli (it is not used when your flavor is
  // used programatically)
  console.log(`Hello server is running at ${cliArgs.host}:${cliArgs.port}`);
}

````

Check out the [example implementation](./example) for a more-in-depth example.
