import {
  Data,
  Quantity,
  keccak,
  BUFFER_EMPTY,
  uintToBuffer
} from "@ganache/utils";
import { EthereumRawTx } from "./raw";
import { digest, encode, encodeRange } from "@ganache/rlp";
import { Address } from "@ganache/ethereum-address";

let secp256k1;
try {
  secp256k1 = require("node-gyp-build")(__dirname);
} catch (err) {
  secp256k1 = require("secp256k1/lib/elliptic");
}

const intToBuffer = (value: number) =>
  value === 0 ? BUFFER_EMPTY : uintToBuffer(value);

/**
 * Copies `length` bytes from `source` to the `target`, filling remaining
 * bytes beyond `length - source.length` with `0`. Fills to the left.
 *
 * ```typescript
 * const source = Buffer.from([1, 2, 3]);
 * const target = Buffer.from([9, 9, 9, 9, 9, 9]);
 * copyOrFill(source, target, 1, 4);
 * // target.equals(Buffer.from([9, 0, 1, 2, 3, 9]));
 * //                               ^  ^  ^  ^
 * ```
 *
 * @param source A Buffer to copy from.
 * @param target A Buffer to copy into.
 * @param targetStart The offset within `target` at which to begin writing.
 * @param length The amount of bytes to copy or fill into the `target`.
 */
function copyOrFill(
  source: Buffer,
  target: Buffer,
  targetStart: number,
  length: number
) {
  if (source.byteLength > length) throw new Error("Invalid signature");

  // first, copy zeroes
  const numZeroes = length - source.byteLength;
  const endZeroes = targetStart + numZeroes;
  let i = targetStart;
  for (; i < endZeroes; i++) {
    target[i] = 0;
  }

  // then copy the source into the target:
  let end = targetStart + length;
  const sourceOffset = targetStart + numZeroes;
  for (; i < end; i++) {
    target[i] = source[i - sourceOffset];
  }
}

export const isValidSigRecovery = (recovery: number) => {
  return recovery === 1 || recovery === 0;
};

/**
 *
 * @param sharedBuffer A Buffer, where bytes 0 - 97 are to be used by this function
 * @param r
 * @param s
 * @param msgHash
 * @param recovery
 */
export const ecdaRecover = (
  partialRlp: { output: Buffer[] | Readonly<Buffer[]>; length: number },
  sharedBuffer: Buffer,
  v: number,
  chainId: number,
  raw: Buffer[]
) => {
  let data: Buffer;
  let recid: number;

  const eip155V = chainId * 2 + 35;
  const isEip155 = v === eip155V || v === eip155V + 1;

  if (isEip155) {
    const chainBuf = intToBuffer(chainId);
    const extras = [chainBuf, BUFFER_EMPTY, BUFFER_EMPTY] as const;
    const epilogue = encodeRange(extras, 0, 3);
    data = digest(
      [partialRlp.output, epilogue.output],
      partialRlp.length + epilogue.length
    );
    recid = v - eip155V;
  } else {
    data = digest([partialRlp.output], partialRlp.length);
    recid = v - 27;
  }
  if (!isValidSigRecovery(recid)) {
    throw new Error("Invalid signature v value");
  }
  const message = keccak(data);

  const signature = sharedBuffer.slice(0, 64);
  copyOrFill(raw[7], signature, 0, 32);
  copyOrFill(raw[8], signature, 32, 32);

  const output = sharedBuffer.slice(0, 33);
  const success = secp256k1.ecdsaRecover(output, signature, recid, message);
  if (success !== 0) {
    throw new Error("Invalid Signature");
  }
  return output;
};

/**
 *
 * @param sharedBuffer A Buffer, bytes 0 - 65 will be overwritten
 * @param senderPubKey
 */
export const publicKeyConvert = (
  sharedBuffer: Buffer,
  senderPubKey: Buffer
) => {
  const publicKey = sharedBuffer.slice(0, 65);
  const result = secp256k1.publicKeyConvert(publicKey, senderPubKey);
  if (result !== 0) {
    throw new Error("Invalid Signature");
  }
  return publicKey;
};

/**
 * A Buffer that can be reused by `computeFromAddress`.
 */
const SHARED_BUFFER = Buffer.allocUnsafe(65);

export const computeFromAddress = (
  partialRlp: { output: Buffer[] | Readonly<Buffer[]>; length: number },
  v: number,
  raw: EthereumRawTx,
  chainId: number
) => {
  const senderPubKey = ecdaRecover(partialRlp, SHARED_BUFFER, v, chainId, raw);
  const publicKey = publicKeyConvert(SHARED_BUFFER, senderPubKey);
  return Address.from(keccak(publicKey.slice(1)).slice(-20));
};

export const computeHash = (raw: EthereumRawTx) => {
  return Data.from(keccak(encode(raw)), 32);
};

export const computeIntrinsics = (
  v: Quantity,
  raw: EthereumRawTx,
  chainId: number
) => {
  const encodedData = encodeRange(raw, 0, 6);
  const encodedSignature = encodeRange(raw, 6, 3);
  const serialized = digest(
    [encodedData.output, encodedSignature.output],
    encodedData.length + encodedSignature.length
  );
  return {
    from: computeFromAddress(encodedData, v.toNumber(), raw, chainId),
    hash: Data.from(keccak(serialized), 32),
    serialized,
    encodedData,
    encodedSignature
  };
};
