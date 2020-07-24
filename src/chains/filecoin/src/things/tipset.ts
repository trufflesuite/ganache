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
        defaultValue: (options = [{"/":undefined}]) => options.map((rootCid) => new RootCID(rootCid))
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

  // Note that this is naive - it always assumes the first block in the 
  // previous tipset is the parent of the new blocks.
  static createNewTipsetAsChain(previousTipset:Tipset, numNewBlocks:number = 1) {
    let newBlocks:Array<Block> = [];
    let parentBlock = previousTipset.blocks[0];

    for (let i = 0; i < numNewBlocks; i++) {
      newBlocks.push(new Block({
        parents: [
          previousTipset.cids[0]
        ]
      }))
    }

    return new Tipset({
      blocks: newBlocks,
      height: previousTipset.height + 1
    })
  }
}

type SerializedTipset = SerializedObject<TipsetConfig>;

export {
  Tipset,
  SerializedTipset
}