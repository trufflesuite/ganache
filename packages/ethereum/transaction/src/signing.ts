import {
  Data,
  Quantity,
  keccak,
  BUFFER_EMPTY,
  bigIntToBuffer
} from "@ganache/utils";
import {
  EIP1559FeeMarketRawTransaction,
  EIP2930AccessListRawTransaction,
  LegacyRawTransaction,
  TypedRawTransaction
} from "./raw";
import { digest, encodeRange } from "@ganache/rlp";
import { Address } from "@ganache/ethereum-address";
import secp256k1 from "@ganache/secp256k1";

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
 * @param source - A Buffer to copy from.
 * @param target - A Buffer to copy into.
 * @param targetStart - The offset within `target` at which to begin writing.
 * @param length - The amount of bytes to copy or fill into the `target`.
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
 * @param sharedBuffer - A Buffer, where bytes 0 - 97 are to be used by this function
 * @param r -
 * @param s -
 * @param msgHash -
 * @param recovery -
 */
export const ecdsaRecover = (
  partialRlp: { output: Buffer[] | Readonly<Buffer[]>; length: number },
  sharedBuffer: Buffer,
  v: bigint,
  chainId: bigint,
  rBuf: Buffer,
  sBuf: Buffer
) => {
  let data: Buffer;
  let recid: number;

  const eip155V = chainId * 2n + 35n;
  const isEip155 = v === eip155V || v === eip155V + 1n;

  if (isEip155) {
    const chainBuf = bigIntToBuffer(chainId);
    const extras = [chainBuf, BUFFER_EMPTY, BUFFER_EMPTY] as const;
    const epilogue = encodeRange(extras, 0, 3);
    data = digest(
      [partialRlp.output, epilogue.output],
      partialRlp.length + epilogue.length
    );
    recid = Number(v - eip155V);
  } else {
    data = digest([partialRlp.output], partialRlp.length);
    recid = Number(v) - 27;
  }

  return _ecdsaRecover(data, sharedBuffer, rBuf, sBuf, recid);
};

function _ecdsaRecover(
  data: Buffer,
  sharedBuffer: Buffer,
  rBuf: Buffer,
  sBuf: Buffer,
  recid: number
) {
  if (!isValidSigRecovery(recid)) {
    throw new Error("Invalid signature v value");
  }

  const message = keccak(data);

  const signature = sharedBuffer.slice(0, 64);
  copyOrFill(rBuf, signature, 0, 32);
  copyOrFill(sBuf, signature, 32, 32);

  const output = sharedBuffer.slice(0, 33);
  const success = secp256k1.ecdsaRecover(output, signature, recid, message);
  if (success !== 0) {
    throw new Error("Invalid Signature");
  }
  return output;
}

/**
 *
 * @param sharedBuffer - A Buffer, bytes 0 - 65 will be overwritten
 * @param senderPubKey -
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
  v: bigint,
  rBuf: Buffer,
  sBuf: Buffer,
  chainId: bigint
) => {
  const senderPubKey = ecdsaRecover(
    partialRlp,
    SHARED_BUFFER,
    v,
    chainId,
    rBuf,
    sBuf
  );
  const publicKey = publicKeyConvert(SHARED_BUFFER, senderPubKey);
  return Address.from(keccak(publicKey.slice(1)).slice(-20));
};

export const computeIntrinsicsLegacyTx = (
  v: Quantity,
  raw: LegacyRawTransaction,
  chainId: bigint
) => {
  const encodedData = encodeRange(raw, 0, 6);
  const encodedSignature = encodeRange(raw, 6, 3);
  const ranges = [encodedData.output, encodedSignature.output];
  const length = encodedData.length + encodedSignature.length;
  const serialized = digest(ranges, length);

  return {
    from: computeFromAddress(
      encodedData,
      v.toBigInt(),
      raw[7],
      raw[8],
      chainId
    ),
    hash: Data.from(keccak(serialized), 32),
    serialized
  };
};

/**
 * Allocates a buffer of size + 1, to be used by `digest`.
 * The extra byte is used to store the transaction type.
 * The tx type is stored in the first byte of the buffer.
 * @param size
 * @returns
 */
const allocUnsafePrefix = (size: number) => Buffer.allocUnsafe(size + 1);

/**
 * Encodes the given `raw` data and prepends the `prefix` to the output Buffer.
 * @param prefix must be smaller than 0x7f https://eips.ethereum.org/EIPS/eip-2718#transactiontype-only-goes-up-to-0x7f
 * @param raw
 * @returns
 */
export const encodeWithPrefix = (prefix: number, raw: TypedRawTransaction) => {
  const encodedData = encodeRange(raw, 0, raw.length);
  const ranges = [encodedData.output];
  const length = encodedData.length;
  return digestWithPrefix(prefix, ranges, length);
};

/**
 * Digests the rlp `ranges` and prepends the `prefix` to the output Buffer.
 *
 * This function avoids the need to copy the output of `digest` into a new
 * prefixed buffer by over provisioning the initial output buffer.
 * @param prefix must be smaller than 0x7f https://eips.ethereum.org/EIPS/eip-2718#transactiontype-only-goes-up-to-0x7f
 * @param ranges
 * @param length
 * @returns
 */
export const digestWithPrefix = (
  prefix: number,
  ranges: (readonly Buffer[])[],
  length: number
) => {
  // digest the ranges using the provided allocUnsafe function at an offset of `1`
  const output = digest(ranges, length, 1, allocUnsafePrefix);
  // set the first byte to the prefix
  output[0] = prefix;
  return output;
};

export const computeIntrinsicsAccessListTx = (
  v: Quantity,
  raw: EIP2930AccessListRawTransaction
) => {
  const encodedData = encodeRange(raw, 0, 8);
  const encodedSignature = encodeRange(raw, 8, 3);
  const ranges = [encodedData.output, encodedSignature.output];
  const length = encodedData.length + encodedSignature.length;
  const serialized = digestWithPrefix(1, ranges, length);

  const data = digestWithPrefix(1, [encodedData.output], encodedData.length);
  const senderPubKey = _ecdsaRecover(
    data,
    SHARED_BUFFER,
    raw[9],
    raw[10],
    v.toNumber()
  );

  const publicKey = publicKeyConvert(SHARED_BUFFER, senderPubKey);
  const from = Address.from(keccak(publicKey.subarray(1)).subarray(-20));

  return {
    from: from,
    hash: Data.from(keccak(serialized), 32),
    serialized
  };
};

export const computeIntrinsicsFeeMarketTx = (
  v: Quantity,
  raw: EIP1559FeeMarketRawTransaction
) => {
  const encodedData = encodeRange(raw, 0, 9);
  const encodedSignature = encodeRange(raw, 9, 3);
  const ranges = [encodedData.output, encodedSignature.output];
  const length = encodedData.length + encodedSignature.length;
  const serialized = digestWithPrefix(2, ranges, length);

  const data = digestWithPrefix(2, [encodedData.output], encodedData.length);
  const senderPubKey = _ecdsaRecover(
    data,
    SHARED_BUFFER,
    raw[10],
    raw[11],
    v.toNumber()
  );

  const publicKey = publicKeyConvert(SHARED_BUFFER, senderPubKey);
  const from = Address.from(keccak(publicKey.slice(1)).slice(-20));

  return {
    from: from,
    hash: Data.from(keccak(serialized), 32),
    serialized
  };
};
