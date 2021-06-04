import { FilecoinFlavorName } from "../../../../../packages/flavors";
import Server from "../../../../../packages/core/src/server";

const getServer = async (port: number) => {
  const server = new Server({
    flavor: FilecoinFlavorName,
    server: {
      ws: true
    },
    chain: {
      ipfsPort: 5002 // Use a different port than the default, to test it works
    },
    logging: {
      logger: {
        log: () => {}
      }
    }
  });
  await server.listen(port);
  return server;
};

export default getServer;
