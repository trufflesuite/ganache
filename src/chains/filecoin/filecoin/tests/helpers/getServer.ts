import Server from "../../../../../packages/core/src/server";
import { filecoinCallback } from "../../src/plugin-callback";

const getServer = async (port: number, pluginServerOptionsConfig = null) => {
  const server = new Server(
    {
      flavor: "filecoin",
      server: {
        port,
        host: "127.0.0.1",
        callback: filecoinCallback,
        ws: true
      }
    },
    pluginServerOptionsConfig
  );
  await server.listen(port);
  return server;
};

export default getServer;
