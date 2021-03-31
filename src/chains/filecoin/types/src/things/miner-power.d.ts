import { SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { PowerClaim, SerializedPowerClaim } from "./power-claim";
declare type MinerPowerConfig = {
  properties: {
    minerPower: {
      type: PowerClaim;
      serializedType: SerializedPowerClaim;
      serializedName: "MinerPower";
    };
    totalPower: {
      type: PowerClaim;
      serializedType: SerializedPowerClaim;
      serializedName: "TotalPower";
    };
    hasMinPower: {
      type: boolean;
      serializedType: SerializedRootCID;
      serializedName: "HasMinPower";
    };
  };
};
declare class MinerPower
  extends SerializableObject<MinerPowerConfig>
  implements DeserializedObject<MinerPowerConfig> {
  get config(): Definitions<MinerPowerConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<MinerPowerConfig>>
      | Partial<DeserializedObject<MinerPowerConfig>>
  );
  minerPower: PowerClaim;
  totalPower: PowerClaim;
  hasMinPower: boolean;
}
declare type SerializedMinerPower = SerializedObject<MinerPowerConfig>;
export { MinerPower, SerializedMinerPower };
