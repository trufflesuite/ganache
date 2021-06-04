import { createCipheriv, createDecipheriv } from "browserify-aes";
import { scrypt as _scrypt } from "scrypt-js";
const scrypt = (
  password: string,
  salt: string,
  keylen: number,
  options: { N?: number; r?: number; p?: number },
  callback: (err: Error | null, derivedKey: Buffer) => void
) => {
  _scrypt(
    Buffer.from(password, "utf8"),
    Buffer.from(salt, "utf8"),
    options.N,
    options.r,
    options.p,
    keylen
  )
    .then(result => {
      callback(null, Buffer.from(result));
    })
    .catch(e => callback(e, undefined));
};

import {
  createHmac,
  createHash,
  pseudoRandomBytes,
  randomBytes
} from "crypto-browserify";

export default {
  scrypt,
  createHmac,
  createHash,
  pseudoRandomBytes,
  randomBytes,
  createCipheriv,
  createDecipheriv
};

export {
  scrypt,
  createHmac,
  createHash,
  pseudoRandomBytes,
  randomBytes,
  createCipheriv,
  createDecipheriv
};
