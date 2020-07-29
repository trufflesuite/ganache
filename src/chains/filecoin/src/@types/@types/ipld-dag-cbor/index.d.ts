declare module "ipld-dag-cbor" {
  type RawCid = {
    toString():string;
  }
  
  type IpldCbor = {
    util: {
      cid(obj:any):Promise<RawCid>
    }
  }

  let dagCBOR:IpldCbor;

  export default dagCBOR;
}