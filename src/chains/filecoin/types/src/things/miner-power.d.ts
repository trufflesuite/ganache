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
declare type C = MinerPowerConfig;
declare class MinerPower
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  minerPower: PowerClaim;
  totalPower: PowerClaim;
  hasMinPower: boolean;
}
declare type SerializedMinerPower = SerializedObject<C>;
export { MinerPower, SerializedMinerPower };
