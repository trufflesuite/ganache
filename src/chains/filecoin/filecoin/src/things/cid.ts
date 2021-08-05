import { SerializableLiteral } from "./serializable-literal";
import cbor from "borc";
import IPFSCid from "cids";
import multihashing from "multihashing";
import multicodec from "multicodec";

interface CIDConfig {
  type: string;
}

class CID extends SerializableLiteral<CIDConfig> {
  get config() {
    return {};
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value: string): boolean {
    return value.length >= 59 && value.indexOf("ba") == 0;
  }

  static nullCID(): CID {
    const nilCbor = cbor.encode(0); // using null returns a not-nill cbor
    const multihash = multihashing(nilCbor, "blake2b-256");
    const rawCid = new IPFSCid(
      1,
      multicodec.print[multicodec.DAG_CBOR],
      multihash
    );

    return new CID(rawCid.toString());
  }
}

type SerializedCID = string;

export { CID, SerializedCID };
