import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

interface BLSAggregateConfig {
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

class BLSAggregate
  extends SerializableObject<BLSAggregateConfig>
  implements DeserializedObject<BLSAggregateConfig> {
  get config(): Definitions<BLSAggregateConfig> {
    return {
      type: {
        serializedName: "Type",
        defaultValue: 2
      },
      data: {
        serializedName: "Data",
        defaultValue:
          "wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      }
    };
  }

  type: number;
  data: string;
}

type SerializedBLSAggregate = SerializedObject<BLSAggregateConfig>;

export { BLSAggregate, SerializedBLSAggregate };
