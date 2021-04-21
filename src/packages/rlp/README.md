# `@ganache/rlp`

[Recursive Length](https://github.com/ethereum/wiki/wiki/RLP) Prefix Encoding
for Node.js.

Based on https://github.com/ethereumjs/rlp, with some additional optimizations
for encoding:

```typescript
function encodeRange<
  T extends EncodingInput | Readonly<EncodingInput>,
  Start extends RangeOf<T["length"]>
>(
  items: T,
  start: Start,
  length: Exclude<Remainders<T["length"], Start>, 0>
): { length: number; output: Buffer[] } {
  //...;
}
```

Begin RLP encoding of `items`, from `start` until `length`. Call `RLP.digest` to
finish encoding.

Returns an object containing the total `length` of all data in the encoded parts,
and `output`, an array of encoded Buffers.

```typescript
function digest(ranges: Readonly<Buffer[]>[], length: number) {
  // ...
}
```

Finishes encoding started by `encodeRange`.

Returns a Buffer of encoded data.

Additional changes:

- minor optimisations to `encode`
- `encode` only accepts buffers or nested buffer arrays, strings, number, bigint,
  and BN support have been removed.

---

These changes enable encoding data in chunks, avoiding processing the same
inputs multiple times in common scenarios withing Ganache. Example:

```typescript
type EthereumRawTx = [
  nonce: Buffer,
  gasPrice: Buffer,
  gas: Buffer,
  to: Buffer,
  value: Buffer,
  data: Buffer,
  v: Buffer,
  r: Buffer,
  s: Buffer
];
// encode the first 6 entries
const partialRlp = encodeRange(raw, 0, 6);
// encode the last 3 entires
const signature = encodeRange(raw, 6, 3);
// combine all entries
const serialized = digest(
  [partialRlp.output, signature.output],
  partialRlp.length + signature.length
);
return {
  // computing the `from` address requires entries 0-6
  from: computeFromAddress(partialRlp, v.toNumber(), raw, chainId),
  // hash requires entries 0-9
  hash: Data.from(keccak(serialized), 32),
  // serialized uses all entries for storage/transmission
  serialized
};
```
