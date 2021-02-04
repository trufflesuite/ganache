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
declare type C = HeadChangeConfig;
declare class HeadChange
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  type: string;
  val: Tipset;
}
declare type SerializedHeadChange = SerializedObject<C>;
export declare enum HeadChangeType {
  HCRevert = "revert",
  HCApply = "apply",
  HCCurrent = "current"
}
export { HeadChange, SerializedHeadChange };
