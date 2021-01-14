import { SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { PowerClaim, SerializedPowerClaim } from "./power-claim";

type MinerPowerConfig = {
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

class MinerPower
  extends SerializableObject<MinerPowerConfig>
  implements DeserializedObject<MinerPowerConfig> {
  get config(): Definitions<MinerPowerConfig> {
    return {
      minerPower: {
        serializedName: "MinerPower",
        defaultValue: options => new PowerClaim(options)
      },
      totalPower: {
        serializedName: "TotalPower",
        defaultValue: options => new PowerClaim(options)
      },
      hasMinPower: {
        serializedName: "HasMinPower",
        defaultValue: false
      }
    };
  }

  minerPower: PowerClaim;
  totalPower: PowerClaim;
  hasMinPower: boolean;
}

type SerializedMinerPower = SerializedObject<MinerPowerConfig>;

export { MinerPower, SerializedMinerPower };
