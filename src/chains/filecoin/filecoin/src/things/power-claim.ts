import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/actors/builtin/power#Claim

type PowerClaimConfig = {
  properties: {
    rawBytePower: {
      type: bigint;
      serializedType: string;
      serializedName: "RawBytePower";
    };
    qualityAdjPower: {
      type: bigint;
      serializedType: string;
      serializedName: "QualityAdjPower";
    };
  };
};

type C = PowerClaimConfig;

class PowerClaim
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      rawBytePower: {
        deserializedName: "rawBytePower",
        serializedName: "RawBytePower",
        defaultValue: 1n
      },
      qualityAdjPower: {
        deserializedName: "qualityAdjPower",
        serializedName: "QualityAdjPower",
        defaultValue: 1n
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.rawBytePower = super.initializeValue(
      this.config.rawBytePower,
      options
    );
    this.qualityAdjPower = super.initializeValue(
      this.config.qualityAdjPower,
      options
    );
  }

  rawBytePower: bigint;
  qualityAdjPower: bigint;
}

type SerializedPowerClaim = SerializedObject<C>;

export { PowerClaim, SerializedPowerClaim };
