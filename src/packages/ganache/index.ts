import Ganache, { serverDefaults } from "@ganache/core";

export default {
  server: Ganache.server,
  provider: Ganache.provider,
  serverDefaults
};
