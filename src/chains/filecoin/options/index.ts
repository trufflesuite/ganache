/*!
 * @ganache/filecoin-options
 *
 * @copyright Truffle Blockchain Group
 * @author Tim Coulter
 * @license MIT
 */

try {
  module.exports = require("./src");
} catch (e) {
  module.exports = require("../dist/node/ganache-filecoin-options.min.js");
}
