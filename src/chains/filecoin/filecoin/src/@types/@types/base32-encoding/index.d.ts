declare module "base32-encoding" {
  type Base32Encoder = {
    stringify(buf: Buffer, alphabet: string): string;
  };

  let base32: Base32Encoder;

  export default base32;
}
