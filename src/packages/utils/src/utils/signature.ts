import secp256k1 from "@ganache/secp256k1";

type ECDSASignOutput = {
  signature: Uint8Array;
  recid: number;
};

export type ECSignResult = { v: bigint; r: Buffer; s: Buffer };

export function ecsign(
  msgHash: Uint8Array,
  privateKey: Uint8Array
): ECSignResult {
  const output: ECDSASignOutput = {
    signature: new Uint8Array(64),
    recid: null
  };
  const status = secp256k1.ecdsaSign(output, msgHash, privateKey);
  if (status !== 0) {
    throw new Error(
      "The nonce generation function failed, or the private key was invalid"
    );
  }
  const { signature, recid } = output;
  const buffer = signature.buffer;
  const r = Buffer.from(buffer, 0, 32);
  const s = Buffer.from(buffer, 32, 32);
  const v = BigInt(recid);
  return { r, s, v };
}

export function ecsignLegacy(
  msgHash: Uint8Array,
  privateKey: Uint8Array,
  chainId?: bigint
): ECSignResult {
  const { v, r, s } = ecsign(msgHash, privateKey);

  const legacyV =
    chainId === undefined ? v + 27n : v + 35n + BigInt(chainId) * 2n;
  return { r, s, v: legacyV };
}
