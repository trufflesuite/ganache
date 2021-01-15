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
      type: string; // should probably be uint8array https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#ElectionProof
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
        defaultValue: () => {
          return "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX";
        }
      }
    };
  }

  winCount: number;
  vrfProof: string;
}

type SerializedElectionProof = SerializedObject<ElectionProofConfig>;

export { ElectionProof, SerializedElectionProof };
