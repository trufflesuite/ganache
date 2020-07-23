import {Block, SerializedBlock} from "./block";
import CID from "./cid";
import { SerializableObject, DeserializedObject, Definitions, SerializedObject } from "./serializableobject";
import { RootCID, SerializedRootCID } from "./rootcid";

interface TipsetConfig { 
  properties: {
    cids: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Cids";
    },
    blocks: {
      type: Array<Block>, 
      serializedType: Array<SerializedBlock>;
      serializedName: "Blocks";
    },
    height: {
      type: number;
      serializedType: number;
      serializedName: "Height";
    }
  }
}

class Tipset extends SerializableObject<TipsetConfig> implements DeserializedObject<TipsetConfig> {
  get config():Definitions<TipsetConfig> {
    return {
      cids: {
        serializedName: "Cids",
        defaultValue: (options = []) => options.map((rootCid) => new RootCID(rootCid))
      },
      blocks: {
        serializedName: "Blocks",
        defaultValue: (options = []) => options.map((block) => new Block(block))
      },
      height: {
        serializedName: "Height",
        defaultValue: 0
      }
    }
  }

  cids: Array<RootCID>;
  blocks: Array<Block>;
  height: number;
}

type SerializedTipset = SerializedObject<TipsetConfig>;

export {
  Tipset,
  SerializedTipset
}