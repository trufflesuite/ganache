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
declare type C = PowerClaimConfig;
declare class PowerClaim
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  rawBytePower: bigint;
  qualityAdjPower: bigint;
}
declare type SerializedPowerClaim = SerializedObject<C>;
export { PowerClaim, SerializedPowerClaim };
