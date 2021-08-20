/*
 * This file is the entry point for the resultant bundle dist/node/ganache.min.js
 * dist/cli/ganache.min.js will then point to dist/node/ganache.min.js
 * whenever it references @ganache/core.
 * This is so we avoid an extra set of native node modules in dist/cli, just use what's in dist/node.
 */
export {
  Server,
  Provider,
  ServerOptions,
  ProviderOptions,
  server,
  provider
} from "@ganache/core";
import Ganache from "@ganache/core";
export default Ganache;
