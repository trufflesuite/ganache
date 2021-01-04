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

class BlockSignature
  extends SerializableObject<BlockSignatureConfig>
  implements DeserializedObject<BlockSignatureConfig> {
  get config(): Definitions<BlockSignatureConfig> {
    return {
      type: {
        serializedName: "Type",
        defaultValue: 2
      },
      data: {
        serializedName: "Data",
        defaultValue:
          "t1vv8DSsC2vAVmJsEjVyZgLcYS4+AG0qQzViaVWhfdW24YOt7qkRuDxSftbis/ZlDgCc1sGom26PvnLKLe4H0qJP7B4wW3yw8vp0zovZUV9zW1QkpKGJgO7HIhFlQcg9"
      }
    };
  }

  type: number;
  data: string;
}

type SerializedBlockSignature = SerializedObject<BlockSignatureConfig>;

export { BlockSignature, SerializedBlockSignature };
