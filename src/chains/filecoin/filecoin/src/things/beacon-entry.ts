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
      type: string; // should probably be uint8array https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#BeaconEntry
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
