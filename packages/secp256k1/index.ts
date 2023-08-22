/*!
 * @ganache/secp256k1
 *
 * @author David Murdoch
 * @license MIT
 */

import { dirname } from "path";

export const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export const SECP256K1_MAX_PRIVATE_KEY_DIV_2 =
  0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n; // (SECP256K1_N - 1n) / 2n

let secp256k1: {
  ecdsaRecover: (
    output: Uint8Array,
    signature: Uint8Array,
    recid: number,
    message: Uint8Array
  ) => 0 | 1;
  publicKeyConvert: (output: Uint8Array, senderPubKey: Uint8Array) => 0 | 1 | 2;
  publicKeyCreate: (output: Uint8Array, secretKey: Buffer) => 0 | 1 | 2;
  privateKeyTweakAdd: (output: Uint8Array, secretKey: Buffer) => 0 | 1 | 2;
  ecdsaSign: (
    output: { signature: Uint8Array; recid: number },
    msgHash: Uint8Array,
    privateKey: Uint8Array
  ) => 0 | 1;
};
try {
  // TODO: find a better way :-)
  // use `eval` to make `ganache`'s webpack ignore this
  const nodeRequire: NodeRequire = eval("require");
  const path = nodeRequire.resolve("secp256k1/package.json");
  const dir = dirname(path);
  const nodeGypBuild = require("node-gyp-build");
  // load native secp256k1
  const { Secp256k1 } = nodeGypBuild(dir);
  secp256k1 = new Secp256k1();
} catch {
  // on error use the JS fallback
  secp256k1 = require("secp256k1/lib/elliptic");
}

export default secp256k1;
