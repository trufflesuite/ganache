/*!
 * @ganache/secp256k1
 *
 * @author David Murdoch
 * @license MIT
 */

import { dirname } from "path";

let secp256k1: {
  ecdsaRecover: (
    output: Uint8Array,
    signature: Uint8Array,
    recid: number,
    message: Uint8Array
  ) => 0 | 1;
  publicKeyConvert: (output: Uint8Array, senderPubKey: Uint8Array) => 0 | 1 | 2;
  ecdsaSign: (
    output: { signature: Uint8Array; recid: number },
    msgHash: Uint8Array,
    privateKey: Uint8Array
  ) => 0 | 1;
};
try {
  // load native secp256k1, if possible
  secp256k1 = new (require("node-gyp-build")(
    dirname(require.resolve("secp256k1/package.json"))
  ).Secp256k1)();
} catch (err) {
  secp256k1 = require("secp256k1/lib/elliptic");
}
export default secp256k1;
