import Server from "../../../../../packages/core/src/server";

const getServer = async (port: number, pluginServerOptionsConfig = null) => {
  const server = new Server(
    {
      flavor: "filecoin",
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
    },
    pluginServerOptionsConfig
  );
  await server.listen(port);
  return server;
};

export default getServer;
