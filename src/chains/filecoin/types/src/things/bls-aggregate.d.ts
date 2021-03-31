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
declare class BLSAggregate
  extends SerializableObject<BLSAggregateConfig>
  implements DeserializedObject<BLSAggregateConfig> {
  get config(): Definitions<BLSAggregateConfig>;
  type: number;
  data: string;
}
declare type SerializedBLSAggregate = SerializedObject<BLSAggregateConfig>;
export { BLSAggregate, SerializedBLSAggregate };
