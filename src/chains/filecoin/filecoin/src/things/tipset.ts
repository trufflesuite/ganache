import { Block, SerializedBlock } from "./block";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";

interface TipsetConfig {
  properties: {
    cids: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Cids";
    };
    blocks: {
      type: Array<Block>;
      serializedType: Array<SerializedBlock>;
      serializedName: "Blocks";
    };
    height: {
      type: number;
      serializedType: number;
      serializedName: "Height";
    };
  };
}

class Tipset
  extends SerializableObject<TipsetConfig>
  implements DeserializedObject<TipsetConfig> {
  get config(): Definitions<TipsetConfig> {
    return {
      cids: {
        serializedName: "Cids",
        defaultValue: (options = []) =>
          options.map(rootCid => new RootCID(rootCid))
      },
      blocks: {
        serializedName: "Blocks",
        defaultValue: (options = []) => options.map(block => new Block(block))
      },
      height: {
        serializedName: "Height",
        defaultValue: 0
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<TipsetConfig>>
      | Partial<DeserializedObject<TipsetConfig>>
  ) {
    super(options);

    // Calculate Cid's if not specified
    if (this.cids.length == 0) {
      for (const block of this.blocks) {
        this.cids.push(
          new RootCID({
            "/": block.cid
          })
        );
      }
    }
  }

  cids: Array<RootCID>;
  blocks: Array<Block>;
  height: number;
}

type SerializedTipset = SerializedObject<TipsetConfig>;

export { Tipset, SerializedTipset };
