import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { Tipset, SerializedTipset } from "./tipset";
interface HeadChangeConfig {
  properties: {
    type: {
      type: string;
      serializedType: string;
      serializedName: "Type";
    };
    val: {
      type: Tipset;
      serializedType: SerializedTipset;
      serializedName: "Val";
    };
  };
}
declare class HeadChange
  extends SerializableObject<HeadChangeConfig>
  implements DeserializedObject<HeadChangeConfig> {
  get config(): Definitions<HeadChangeConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<HeadChangeConfig>>
      | Partial<DeserializedObject<HeadChangeConfig>>
  );
  type: string;
  val: Tipset;
}
declare type SerializedHeadChange = SerializedObject<HeadChangeConfig>;
export declare enum HeadChangeType {
  HCRevert = "revert",
  HCApply = "apply",
  HCCurrent = "current"
}
export { HeadChange, SerializedHeadChange };
