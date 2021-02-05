import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#ElectionProof

interface ElectionProofConfig {
  properties: {
    winCount: {
      type: number;
      serializedType: number;
      serializedName: "WinCount";
    };
    vrfProof: {
      type: Buffer;
      serializedType: string;
      serializedName: "VRFProof";
    };
  };
}

class ElectionProof
  extends SerializableObject<ElectionProofConfig>
  implements DeserializedObject<ElectionProofConfig> {
  get config(): Definitions<ElectionProofConfig> {
    return {
      winCount: {
        deserializedName: "winCount",
        serializedName: "WinCount",
        defaultValue: 1
      },
      vrfProof: {
        deserializedName: "vrfProof",
        serializedName: "VRFProof",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<ElectionProofConfig>>
      | Partial<DeserializedObject<ElectionProofConfig>>
  ) {
    super();

    this.winCount = super.initializeValue(this.config.winCount, options);
    this.vrfProof = super.initializeValue(this.config.vrfProof, options);
  }

  winCount: number;
  vrfProof: Buffer;
}

type SerializedElectionProof = SerializedObject<ElectionProofConfig>;

export { ElectionProof, SerializedElectionProof };
