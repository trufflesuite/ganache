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
declare class Tipset
  extends SerializableObject<TipsetConfig>
  implements DeserializedObject<TipsetConfig> {
  get config(): Definitions<TipsetConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<TipsetConfig>>
      | Partial<DeserializedObject<TipsetConfig>>
  );
  cids: Array<RootCID>;
  blocks: Array<Block>;
  height: number;
}
declare type SerializedTipset = SerializedObject<TipsetConfig>;
export { Tipset, SerializedTipset };
