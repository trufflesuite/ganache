import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
interface BeaconEntryConfig {
  properties: {
    round: {
      type: number;
      serializedType: number;
      serializedName: "Round";
    };
    data: {
      type: string;
      serializedType: string;
      serializedName: "Data";
    };
  };
}
declare class BeaconEntry
  extends SerializableObject<BeaconEntryConfig>
  implements DeserializedObject<BeaconEntryConfig> {
  get config(): Definitions<BeaconEntryConfig>;
  round: number;
  data: string;
}
declare type SerializedBeaconEntry = SerializedObject<BeaconEntryConfig>;
export { BeaconEntry, SerializedBeaconEntry };
