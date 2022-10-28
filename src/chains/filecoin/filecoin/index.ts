/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import { Flavor } from "@ganache/flavor";
import { FilecoinDefaults, defaults } from "./src/defaults";
import { Connector, FilecoinProvider } from "./src/connector";
import { initialize } from "./src/initialize";

export {
  FilecoinProvider as Provider,
  StorageDealStatus
} from "./src/connector";

interface FilecoinFlavor extends Flavor<FilecoinProvider, FilecoinDefaults> {
  Connector: typeof Connector;
  flavor: "@ganache/filecoin" | "filecoin";
  defaults: FilecoinDefaults;
}

const FilecoinFlavor: FilecoinFlavor = {
  Connector,
  flavor: "@ganache/filecoin",
  defaults,
  initialize
};

export default FilecoinFlavor;
