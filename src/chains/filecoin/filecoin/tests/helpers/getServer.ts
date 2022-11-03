import { join } from "path";
import FilecoinFlavor from "../../";
import Server from "../../../../../packages/core/src/server";

const getServer = async (port: number) => {
  const server = new Server<FilecoinFlavor>({
    // `join(__dirname, "..", "..") as unknown as "filecoin""` since @ganache/filecoin isn't
    // _installed_ in this package since it _is_ this package; we can't use the
    // package name itself here.
    flavor: join(__dirname, "..", "../lib/index.js") as unknown as "filecoin",
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
