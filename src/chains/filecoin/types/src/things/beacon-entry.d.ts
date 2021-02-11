/// <reference types="node" />
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
      type: Buffer;
      serializedType: string;
      serializedName: "Data";
    };
  };
}
declare class BeaconEntry
  extends SerializableObject<BeaconEntryConfig>
  implements DeserializedObject<BeaconEntryConfig> {
  get config(): Definitions<BeaconEntryConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<BeaconEntryConfig>>
      | Partial<DeserializedObject<BeaconEntryConfig>>
  );
  round: number;
  data: Buffer;
}
declare type SerializedBeaconEntry = SerializedObject<BeaconEntryConfig>;
export { BeaconEntry, SerializedBeaconEntry };
