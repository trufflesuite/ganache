/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import { Flavor, ServerOptionsConfig } from "@ganache/flavor";
import { Connector, FilecoinProvider } from "./src/connector";
import { initialize } from "./src/initialize";
import { ServerDefaults } from "./src/defaults";

export {
  FilecoinProvider as Provider,
  StorageDealStatus
} from "./src/connector";

interface FilecoinFlavor extends Flavor<FilecoinProvider, ServerOptionsConfig> {
  Connector: typeof Connector;
  flavor: "@ganache/filecoin" | "filecoin";
  serverOptions: ServerOptionsConfig;
}

const FilecoinFlavor: FilecoinFlavor = {
  Connector,
  flavor: "@ganache/filecoin",
  serverOptions: ServerOptionsConfig,
  initialize
};

export default FilecoinFlavor;
