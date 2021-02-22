/*
 * This file is the entry point for the resultant bundle dist/node/ganache.min.js
 * dist/cli/ganache.min.js will then point dist/node/ganache.min.js
 * whenever it references @ganache/core.
 * This is so we avoid an extra set of native node modules in dist/cli, just use what's in dist/node.
 */
import Ganache from "@ganache/core";

export { serverDefaults } from "@ganache/core";

export default {
  server: Ganache.server,
  provider: Ganache.provider
};
