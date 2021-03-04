/*!
 * @ganache/filecoin-options
 *
 * @copyright Truffle Blockchain Group
 * @author Tim Coulter
 * @license MIT
 */

// export types
export {
  FilecoinLegacyProviderOptions,
  FilecoinProviderOptions,
  FilecoinInternalOptions
} from "./src";

// export objects
let e: any;
try {
  e = require("./src");
} catch (e) {
  e = require("../dist/node/ganache-filecoin-options.min.js");
}

export default e;
