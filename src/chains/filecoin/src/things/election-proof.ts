import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

interface ElectionProofConfig {
  properties: {
    vrfProof: {
      type: string;
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
      vrfProof: {
        serializedName: "VRFProof",
        defaultValue: () => {
          return "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX";
        }
      }
    };
  }

  vrfProof: string;
}

type SerializedElectionProof = SerializedObject<ElectionProofConfig>;

export { ElectionProof, SerializedElectionProof };
