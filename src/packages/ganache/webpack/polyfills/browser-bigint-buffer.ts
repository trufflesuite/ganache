export function toBigIntBE(buf: Buffer) {
  // TODO(perf): this is slow. Can we make it fast in browserland?
  return BigInt(`0x${buf.toString("hex")}`);
}
