declare module "base32-encoding" {
  type Base32Encoder = {
    /**
     * Encode a normal Buffer as base32, meaning only the lower 5 bits are used.
     * Takes `⌈len * 8 / 5⌉` bytes to encode. Takes optional Buffer `output` instead
     * of allocating a new Buffer internally, and writes at optional `offset`.
     * Returns `output`. Sets `base32.encode.bytes` to the number of bytes written.
     */
    encode(buf: Buffer, output?: Buffer, offset?: number): Buffer;

    /**
     * Decode a base32 Buffer as a normal, "base256" Buffer, meaning only the lower
     * 5 bits are read from `buf` and assembled into complete 8 bit bytes. Takes
     * `⌊len * 5 / 8⌋` bytes to encode. Takes optional Buffer `output` instead of
     * allocating a new Buffer internally, and writes at optional `offset`.
     * Returns `output`. Sets `base32.decode.bytes` to the number of bytes written.
     */
    decode(b32: Buffer, output?: Buffer, offset?: number): Buffer;

    /**
     * Encode `buf` to base32 and translate into a string using optional `alphabet`.
     * `alphabet` defaults to `23456789abcdefghijkmnpqrstuvwxyz` (missing `o01l`).
     */
    stringify(buf: Buffer, alphabet?: string): string;

    /**
     * Decode `str` from base32 and translate into a Buffer using optional `alphabet`.
     * `alphabet` defaults to `23456789abcdefghijkmnpqrstuvwxyz` (missing `o01l`).
     */
    parse(str: string, alphabet?: string): Buffer;
  };

  let base32: Base32Encoder;

  export default base32;
}
