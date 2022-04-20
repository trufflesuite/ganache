/*!
 * @ganache/filecoin
 *
 * @author Tim Coulter
 * @license MIT
 */

import {
  Connector as FilecoinConnector,
  FilecoinProvider,
  StorageDealStatus
} from "./src/connector";
export type {
  Connector as FilecoinConnector,
  FilecoinProvider,
  StorageDealStatus
} from "./src/connector";

export default {
  Connector: FilecoinConnector,
  FilecoinProvider,
  StorageDealStatus
};
