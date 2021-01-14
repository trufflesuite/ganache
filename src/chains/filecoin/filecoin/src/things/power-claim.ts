import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

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
        serializedName: "RawBytePower",
        defaultValue: 1n
      },
      qualityAdjPower: {
        serializedName: "QualityAdjPower",
        defaultValue: 1n
      }
    };
  }

  rawBytePower: bigint;
  qualityAdjPower: bigint;
}

type SerializedPowerClaim = SerializedObject<PowerClaimConfig>;

export { PowerClaim, SerializedPowerClaim };
