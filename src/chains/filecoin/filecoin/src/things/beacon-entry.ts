import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus/chain/types#BeaconEntry

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

class BeaconEntry
  extends SerializableObject<BeaconEntryConfig>
  implements DeserializedObject<BeaconEntryConfig> {
  get config(): Definitions<BeaconEntryConfig> {
    return {
      round: {
        serializedName: "Round",
        defaultValue: 0
      },
      data: {
        serializedName: "Data",
        defaultValue: Buffer.from([0])
      }
    };
  }

  round: number;
  data: Buffer;
}

type SerializedBeaconEntry = SerializedObject<BeaconEntryConfig>;

export { BeaconEntry, SerializedBeaconEntry };
