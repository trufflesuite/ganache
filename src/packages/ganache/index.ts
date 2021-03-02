/*
 * This file is the entry point for the resultant bundle dist/node/ganache.min.js
 * dist/cli/ganache.min.js will then point to dist/node/ganache.min.js
 * whenever it references @ganache/core.
 * This is so we avoid an extra set of native node modules in dist/cli, just use what's in dist/node.
 */
import Ganache from "@ganache/core";

export { serverDefaults } from "@ganache/core";

export const server = Ganache.server;

// Need to add this type annotation of Ganache.provider
// to prevent a TS error about inferred types and not being portable
export const provider: typeof Ganache.provider = Ganache.provider;

export default {
  server: Ganache.server,
  provider: Ganache.provider
};
