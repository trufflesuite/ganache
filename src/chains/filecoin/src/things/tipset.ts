import {Block, SerializedBlockParameters} from "./block";
import CID from "./cid";
import { SerializableObject } from "./serializableobject";
import { RootCID, SerializedRootCIDParameters } from "./rootcid";

interface TipsetParameters {
  cids?: Array<RootCID>;
  blocks?: Array<Block>;
  height: number;
}

interface SerializedTipsetParameters {
  Cids: Array<SerializedRootCIDParameters>;
  Blocks: Array<SerializedBlockParameters>;
  Height: number;
}

class Tipset extends SerializableObject<TipsetParameters, SerializedTipsetParameters> {
  defaults(options:SerializedTipsetParameters):TipsetParameters {
    return {
      cids: options.Cids ? [
        ...options.Cids.map((cid) => new RootCID(cid))
      ] : [new RootCID()],
      blocks: options.Blocks ? [
        ...options.Blocks.map((block) => new Block(block))
      ] : [],
      height: options.Height || 0
    }
  }

  keyMapping():Record<keyof TipsetParameters,keyof SerializedTipsetParameters> {
    return {
      cids: "Cids",
      blocks: "Blocks",
      height: "Height"
    }
  }
}

export {
  Tipset,
  TipsetParameters,
  SerializedTipsetParameters
}