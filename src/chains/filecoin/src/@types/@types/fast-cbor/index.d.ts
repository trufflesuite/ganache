declare module "fast-cbor" {
  type FastCbor = {
    encode(obj:any):Buffer;
  }

  let cbor:FastCbor;

  export default cbor;
}