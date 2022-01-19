declare module "borc" {
  type Borc = {
    encode(obj: any): Buffer;
  };

  let cbor: Borc;

  export default cbor;
}
