import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
interface BlockSignatureConfig {
  properties: {
    type: {
      type: number;
      serializedType: number;
      serializedName: "Type";
    };
    data: {
      type: string;
      serializedType: string;
      serializedName: "Data";
    };
  };
}
declare class BlockSignature
  extends SerializableObject<BlockSignatureConfig>
  implements DeserializedObject<BlockSignatureConfig> {
  get config(): Definitions<BlockSignatureConfig>;
  type: number;
  data: string;
}
declare type SerializedBlockSignature = SerializedObject<BlockSignatureConfig>;
export { BlockSignature, SerializedBlockSignature };
