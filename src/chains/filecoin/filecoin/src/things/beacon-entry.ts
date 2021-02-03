import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#BeaconEntry

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

type C = BeaconEntryConfig;

class BeaconEntry
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      round: {
        deserializedName: "round",
        serializedName: "Round",
        defaultValue: 0
      },
      data: {
        deserializedName: "data",
        serializedName: "Data",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.round = super.initializeValue(this.config.round, options);
    this.data = super.initializeValue(this.config.data, options);
  }

  round: number;
  data: Buffer;
}

type SerializedBeaconEntry = SerializedObject<C>;

export { BeaconEntry, SerializedBeaconEntry };
