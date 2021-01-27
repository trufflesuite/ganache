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

class PowerClaim
  extends SerializableObject<PowerClaimConfig>
  implements DeserializedObject<PowerClaimConfig> {
  get config(): Definitions<PowerClaimConfig> {
    return {
      rawBytePower: {
        deserializedName: "rawBytePower",
        serializedName: "RawBytePower",
        defaultValue: literal => (literal ? BigInt(literal) : 1n)
      },
      qualityAdjPower: {
        deserializedName: "qualityAdjPower",
        serializedName: "QualityAdjPower",
        defaultValue: literal => (literal ? BigInt(literal) : 1n)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<PowerClaimConfig>>
      | Partial<DeserializedObject<PowerClaimConfig>>
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

type SerializedPowerClaim = SerializedObject<PowerClaimConfig>;

export { PowerClaim, SerializedPowerClaim };
