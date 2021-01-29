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

type C = HeadChangeConfig;

class HeadChange
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
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
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.type = super.initializeValue(this.config.type, options);
    this.val = super.initializeValue(this.config.val, options);
  }

  type: string;
  val: Tipset;
}

type SerializedHeadChange = SerializedObject<C>;

// Retrieved these from https://git.io/Jtvke
export enum HeadChangeType {
  HCRevert = "revert",
  HCApply = "apply",
  HCCurrent = "current"
}

export { HeadChange, SerializedHeadChange };
