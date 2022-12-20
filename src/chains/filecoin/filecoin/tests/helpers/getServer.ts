import { FilecoinFlavorName } from "../../../../../packages/flavors";
import Server from "../../../../../packages/core/src/server";
import { findPort } from "find-open-port";

const getServer = async () => {
  const port = await findPort();
  const ipfsPort = await findPort();
  const server = new Server({
    flavor: FilecoinFlavorName,
    server: {
      ws: true
    },
    chain: {
      ipfsPort
    },
    logging: {
      logger: {
        log: () => {}
      }
    }
  });
  await server.listen(port);
  return { server, port };
};

export default getServer;
