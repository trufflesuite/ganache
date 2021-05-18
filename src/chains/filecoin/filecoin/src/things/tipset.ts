import { BlockHeader, SerializedBlockHeader } from "./block-header";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#TipSet

interface TipsetConfig {
  properties: {
    cids: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Cids";
    };
    blocks: {
      type: Array<BlockHeader>;
      serializedType: Array<SerializedBlockHeader>;
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
        deserializedName: "cids",
        serializedName: "Cids",
        defaultValue: options =>
          options ? options.map(rootCid => new RootCID(rootCid)) : []
      },
      blocks: {
        deserializedName: "blocks",
        serializedName: "Blocks",
        defaultValue: options =>
          options ? options.map(block => new BlockHeader(block)) : []
      },
      height: {
        deserializedName: "height",
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
    super();

    this.cids = super.initializeValue(this.config.cids, options);
    this.blocks = super.initializeValue(this.config.blocks, options);
    this.height = super.initializeValue(this.config.height, options);

    // Calculate Cid's if not specified
    if (this.cids.length === 0) {
      for (const block of this.blocks) {
        this.cids.push(
          new RootCID({
            root: block.cid
          })
        );
      }
    }
  }

  /**
   * An array that contains the BlockHeader.cid().
   * If not provided, constructor will auto add this array.
   * There's no documentation specifying this, so here is
   * the reference Implementation: https://git.io/Jt3VM
   */
  cids: Array<RootCID>;
  blocks: Array<BlockHeader>;
  height: number;
}

type SerializedTipset = SerializedObject<TipsetConfig>;

export { Tipset, TipsetConfig, SerializedTipset };
