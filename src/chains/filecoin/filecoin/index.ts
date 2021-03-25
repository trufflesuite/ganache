/*!
 * @ganache/filecoin
 *
 * @copyright Truffle Blockchain Group
 * @author Tim Coulter
 * @license MIT
 */

try {
  module.exports = require("./src/connector");
} catch (e) {
  module.exports = require("../dist/node/ganache-filecoin.min.js");
}
