/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import { Connector, Provider, StorageDealStatus } from "./src/connector";
import {
  filecoinCallback,
  ganachePlugin,
  serverDefaults,
  serverOptionsConfig
} from "./src/plugin-callback";

export type { Connector, Provider, StorageDealStatus } from "./src/connector";

export default {
  Connector,
  Provider,
  StorageDealStatus,
  filecoinCallback,
  ganachePlugin,
  serverDefaults,
  serverOptionsConfig
};
