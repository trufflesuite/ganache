import { BlockHeader, SerializedBlockHeader } from "./block-header";
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
declare class Tipset
  extends SerializableObject<TipsetConfig>
  implements DeserializedObject<TipsetConfig> {
  get config(): Definitions<TipsetConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<TipsetConfig>>
      | Partial<DeserializedObject<TipsetConfig>>
  );
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
declare type SerializedTipset = SerializedObject<TipsetConfig>;
export { Tipset, TipsetConfig, SerializedTipset };
