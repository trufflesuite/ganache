import { Flavor, Connector, CliSettings, Executor } from "./";

export type Provider = { sayHi: (name: string) => string };
export type RequestPayload = { name: string };
export type ResponsePayload = { result: string };

const provider: Provider = {
  sayHi(name: string) {
    return `Hello, ${name}`;
  }
};

const helloConnector: Connector<Provider, RequestPayload, ResponsePayload> = {
  // the `provider` is yours to implement however you'd like. In programmatic
  // usage it will be returned to the user when they call
  // `Ganache.provider()` or `Ganache.server().provider`
  provider,

  async connect(): Promise<void> {
    // ganache will `await` the return of your `connect` method before
    // forwarding any requests to your connector. If your connector doesn't need
    // to do any async work to initialize you can leave this function as a noop.
  },

  parse(message: Buffer) {
    // the `message` doesn't have to be JSON, you can use any data interchange
    // format you'd like.
    // NOTE: If your connector's `parse` method throws, Ganache does
    // _not_ call your `formatError` and instead returns a `400 Bad Request`
    // response.
    return JSON.parse(message);
  },

  async handle(
    this: typeof helloConnector,
    payload: RequestPayload
  ): Promise<{ value: unknown }> {
    if (!payload || typeof payload.name !== "string") {
      // you can throw an Exception here and ganache will catch the error and
      // pass it to your `formatError` function.
      throw new Error("payload must have a `name` property of type `string`");
    }

    // in this "Hello World" example we only have one method, but you can
    // implement as many as you need in any way you want. Here we just call the
    // our provider's `sayHi` with the user provided `payload`'s `name`
    //  property.
    const value = this.provider.sayHi(payload.name);

    // Your `handle` function MUST always return any object with a `value`
    // property. The value of `value` MAY itself be a `Promise`. The _resolved_
    // `value` will be passed to your connector's `format` function.
    //
    // NOTE: if a client is connected via WebSockets, and the the `value` is a
    // `PromiEvent` (a `Promise` that also has an `on` function) that emits a
    // `"message"` event Ganache will subscribe to the `"message"` event. If
    // the `PromiEvent` then emits a "message" its event data will be sent to
    // the client.
    // ATTENTION: A flavor cannot `format` this message though; it will always
    // be sent as am Ethereum JSON-RPC 2.0 subscription style message. This
    // behavior will change in the future *without notice*. It is not recommened
    // that you use the PromiEvent feature at this time.
    return { value };
  },

  format(result: ResponsePayload, payload: RequestPayload) {
    console.log(
      `formatting result (${result.result}) for payload (${payload.name})`
    );
    // You don't have to return a string here, you can also return a Buffer
    // and the serialization doesn't have to be JSON. However...
    // ATTENTION: ganache flavors don't support changing the `content-type` header
    // so it always returns `content-type: application/json`. This will change
    // in the future and flavors will be able to specify their own content-type
    // and other HTTP headers.
    //
    // You can also return a Generator (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)
    // which will cause ganache to send the response in chunks (one chunk for
    // yield). This is useful if your response data is too large for Node.js to
    // handle (string and Buffer sizes are limited to about 1-2GB, and memory is
    // capped to 4GB on most systems).
    return JSON.stringify({ result });
  },

  formatError(error: Error, payload: RequestPayload) {
    // Ganache calls your `formatError` if any errors occured while processing
    // a request.

    console.log(`formatting error (${error.message}) for payload (${payload})`);
    // you don't have to return a string here, you can also return a Buffer
    // and the serialization doesn't have to be JSON
    return JSON.stringify({ error: error.message });
  },

  async close() {
    // ganache calls your connector's `close` function when shutting down.
    // This is where you'd perform clean up, like closing database connections
    // or cleaning temporary files.
  }
};

type HelloFlavor = Flavor<"hello-chain", typeof helloConnector>;

const HelloFlavor: HelloFlavor = {
  flavor: "hello-chain",
  options: {
    // see the `example/` directory for how Options work
  },
  connect(providerOptions: never, executor: Executor) {
    // # About the `Executor`
    // The `executor` is a helper class that can be used to coordinate request
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
  ready: (provider: Provider, cliArgs: CliSettings) => {
    // this function is only after ganache CLI (and only CLI) has fully
    // initialized (it is not used if your flavor is used progamatically)
    console.log(`Hello server is running at ${cliArgs.host}:${cliArgs.port}`);
  }
};

/**
 * Your flavor needs to be exported as `default` so Ganache can find it.
 */
export default HelloFlavor;
