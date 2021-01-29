import { SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { PowerClaim, SerializedPowerClaim } from "./power-claim";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#MinerPower

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

type C = MinerPowerConfig;

class MinerPower
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      minerPower: {
        deserializedName: "minerPower",
        serializedName: "MinerPower",
        defaultValue: options => new PowerClaim(options)
      },
      totalPower: {
        deserializedName: "totalPower",
        serializedName: "TotalPower",
        defaultValue: options => new PowerClaim(options)
      },
      hasMinPower: {
        deserializedName: "hasMinPower",
        serializedName: "HasMinPower",
        defaultValue: false
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.minerPower = super.initializeValue(this.config.minerPower, options);
    this.totalPower = super.initializeValue(this.config.totalPower, options);
    this.hasMinPower = super.initializeValue(this.config.hasMinPower, options);
  }

  minerPower: PowerClaim;
  totalPower: PowerClaim;
  hasMinPower: boolean;
}

type SerializedMinerPower = SerializedObject<C>;

export { MinerPower, SerializedMinerPower };
