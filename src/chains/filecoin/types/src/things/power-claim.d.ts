import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type PowerClaimConfig = {
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
declare class PowerClaim
  extends SerializableObject<PowerClaimConfig>
  implements DeserializedObject<PowerClaimConfig> {
  get config(): Definitions<PowerClaimConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<PowerClaimConfig>>
      | Partial<DeserializedObject<PowerClaimConfig>>
  );
  rawBytePower: bigint;
  qualityAdjPower: bigint;
}
declare type SerializedPowerClaim = SerializedObject<PowerClaimConfig>;
export { PowerClaim, SerializedPowerClaim };
