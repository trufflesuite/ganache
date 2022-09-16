/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import type { Flavor } from "@ganache/flavor";
import { Connector } from "./src/connector";
import { initialize } from "./src/initialize";
import { FilecoinOptionsConfig } from "@ganache/filecoin-options";
import { CliOptionsConfig, ServerOptionsConfig } from "./src/defaults";

export {
  FilecoinProvider as Provider,
  StorageDealStatus
} from "./src/connector";

type FilecoinFlavor = Flavor<"filecoin", Connector, FilecoinOptionsConfig, ServerOptionsConfig, CliOptionsConfig>;
const FilecoinFlavor: FilecoinFlavor = {
  flavor: "filecoin",
  connect: (options, executor) => new Connector(options, executor),
  options: {
    provider: FilecoinOptionsConfig,
    server: ServerOptionsConfig,
    cli: CliOptionsConfig
  },
  initialize
};

export default FilecoinFlavor;
