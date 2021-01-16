import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

interface WinPoStProofConfig {
  properties: {
    postProof: {
      type: number;
      serializedType: number;
      serializedName: "PoStProof";
    };
    proofBytes: {
      type: string;
      serializedType: string;
      serializedName: "ProofBytes";
    };
  };
}

class WinPoStProof
  extends SerializableObject<WinPoStProofConfig>
  implements DeserializedObject<WinPoStProofConfig> {
  get config(): Definitions<WinPoStProofConfig> {
    return {
      postProof: {
        serializedName: "PoStProof",
        defaultValue: 0
      },
      proofBytes: {
        serializedName: "ProofBytes",
        defaultValue: "dmFsaWQgcHJvb2Y="
      }
    };
  }

  postProof: number;
  proofBytes: string;
}

type SerializedWinPoStProof = SerializedObject<WinPoStProofConfig>;

export { WinPoStProof, SerializedWinPoStProof };
