declare module "blakejs" {
  type Blake = {
    blake2b(buf:Buffer, key:Uint8Array, outLen:number):Buffer;
  }

  let blake:Blake;

  export default blake;
}