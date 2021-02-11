import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { Tipset, SerializedTipset } from "./tipset";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#HeadChange

interface HeadChangeConfig {
  properties: {
    type: {
      type: string;
      serializedType: string;
      serializedName: "Type";
    };
    val: {
      type: Tipset;
      serializedType: SerializedTipset;
      serializedName: "Val";
    };
  };
}

class HeadChange
  extends SerializableObject<HeadChangeConfig>
  implements DeserializedObject<HeadChangeConfig> {
  get config(): Definitions<HeadChangeConfig> {
    return {
      type: {
        deserializedName: "type",
        serializedName: "Type",
        defaultValue: options => options || HeadChangeType.HCCurrent
      },
      val: {
        deserializedName: "val",
        serializedName: "Val",
        defaultValue: options => new Tipset(options)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<HeadChangeConfig>>
      | Partial<DeserializedObject<HeadChangeConfig>>
  ) {
    super();

    this.type = super.initializeValue(this.config.type, options);
    this.val = super.initializeValue(this.config.val, options);
  }

  type: string;
  val: Tipset;
}

type SerializedHeadChange = SerializedObject<HeadChangeConfig>;

// Retrieved these from https://git.io/Jtvke
export enum HeadChangeType {
  HCRevert = "revert",
  HCApply = "apply",
  HCCurrent = "current"
}

export { HeadChange, SerializedHeadChange };
