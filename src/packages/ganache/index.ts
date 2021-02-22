/*
 * This file is the entry point for the resultant bundle dist/node/ganache.min.js
 * dist/cli/ganache.min.js will then point dist/node/ganache.min.js
 * whenever it references @ganache/core.
 * This is so we avoid an extra set of native node modules in dist/cli, just use what's in dist/node.
 */
import Ganache from "@ganache/core";

export default {
  /**
   * Creates a Ganache server instance that creates and
   * serves an underlying Ganache provider. Initialization
   * doesn't begin until `server.listen(...)` is called.
   * `server.listen(...)` returns a promise that resolves
   * when initialization is finished.
   */
  server: Ganache.server,

  /**
   * Initializes a Web3 provider for a Ganache instance.
   * This function starts an asynchronous task, but does not
   * finish it by the time the function returns. Listen to
   * `provider.on("connect", () => {...})` or wait for
   * `await provider.once("connect")` for initialization to
   * finish. You may start sending requests to the provider
   * before initialization finishes however; these requests
   * will start being consumed after initialization finishes.
   */
  provider: Ganache.provider
};
