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

class BeaconEntry
  extends SerializableObject<BeaconEntryConfig>
  implements DeserializedObject<BeaconEntryConfig> {
  get config(): Definitions<BeaconEntryConfig> {
    return {
      round: {
        serializedName: "Round",
        defaultValue: 1321
      },
      data: {
        serializedName: "Data",
        defaultValue: "qrwddPErWZxCQkTKvTkgKwxazkKZu2Q9nXHW1sPgW7I="
      }
    };
  }

  round: number;
  data: string;
}

type SerializedBeaconEntry = SerializedObject<BeaconEntryConfig>;

export { BeaconEntry, SerializedBeaconEntry };
