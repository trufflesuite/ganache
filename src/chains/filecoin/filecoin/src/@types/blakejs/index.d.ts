declare module "blakejs" {
  type Blake = {
    blake2b(buf: Buffer, key: Uint8Array | null, outLen: number): Uint8Array;
    blake2s(buf: Buffer, key: Uint8Array | null, outLen: number): Uint8Array;

    blake2sInit(outputLen: number, obj: null): any;
    blake2sUpdate(context: any, buf: Buffer);
    blake2sFinal(context: any): Uint8Array;
  };

  let blake: Blake;

  export default blake;
}
