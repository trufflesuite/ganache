/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import {
  Connector,
  FilecoinProvider,
  StorageDealStatus
} from "./src/connector";
import {
  filecoinCallback,
  ganachePlugin,
  serverDefaults,
  serverOptionsConfig
} from "./src/plugin-callback";

export type {
  Connector,
  FilecoinProvider,
  StorageDealStatus
} from "./src/connector";

export default {
  Connector,
  FilecoinProvider,
  StorageDealStatus,
  filecoinCallback,
  ganachePlugin,
  serverDefaults,
  serverOptionsConfig
};
