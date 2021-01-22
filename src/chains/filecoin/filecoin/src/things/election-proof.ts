import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus/chain/types#ElectionProof

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
        serializedName: "WinCount",
        defaultValue: 0
      },
      vrfProof: {
        serializedName: "VRFProof",
        defaultValue: Buffer.from([0])
      }
    };
  }

  winCount: number;
  vrfProof: Buffer;
}

type SerializedElectionProof = SerializedObject<ElectionProofConfig>;

export { ElectionProof, SerializedElectionProof };
