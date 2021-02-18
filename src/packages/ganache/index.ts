import Ganache from "@ganache/core";

export { serverDefaults } from "@ganache/core";

export default {
  server: Ganache.server,
  provider: Ganache.provider
};
