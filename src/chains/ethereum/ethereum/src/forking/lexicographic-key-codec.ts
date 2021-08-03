import { BUFFER_ZERO, BUFFER_EMPTY, Quantity } from "@ganache/utils";

type Piece = [length: Buffer, part: Buffer];

export function encode(parts: Buffer[]) {
  const l = parts.length;
  let totalLength = 0;
  const pieces: Piece[] = [];
  for (let i = 0; i < l; i++) {
    const part = parts[i];
    if (part === null) {
      totalLength += 2; // {length of the length} (`1`) + {length} (`0`)
      pieces.push([BUFFER_ZERO, BUFFER_EMPTY]);
    } else {
      const length = part.length;
      const lengthBuffer = Quantity.from(length).toBuffer();
      const lengthLength = lengthBuffer.length;

      totalLength += 1 + lengthLength + length;
      pieces.push([lengthBuffer, part]);
    }
  }
  const encoded = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  for (let i = 0; i < l; i++) {
    const [lengthBuffer, part] = pieces[i];
    const lengthLength = lengthBuffer.length;
    encoded[offset++] = lengthLength;
    lengthBuffer.copy(encoded, offset, 0, lengthLength);
    part.copy(encoded, (offset += lengthLength), 0, part.length);
    offset += part.length;
  }
  return encoded;
}

export function decode<T extends Buffer[]>(encoded: Buffer): T {
  const parts: Buffer[] = [];
  for (let i = 0, l = encoded.length; i < l; ) {
    const lengthLength = encoded[i++];
    const length = Quantity.from(
      encoded.slice(i, (i += lengthLength))
    ).toNumber();
    parts.push(encoded.slice(i, (i += length)));
  }
  return parts as T;
}
