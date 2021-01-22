import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/specs-actors/actors/runtime/proof#PoStProof

interface PoStProofConfig {
  properties: {
    postProof: {
      type: number;
      serializedType: number;
      serializedName: "PoStProof";
    };
    proofBytes: {
      type: Buffer;
      serializedType: string;
      serializedName: "ProofBytes";
    };
  };
}

class PoStProof
  extends SerializableObject<PoStProofConfig>
  implements DeserializedObject<PoStProofConfig> {
  get config(): Definitions<PoStProofConfig> {
    return {
      postProof: {
        serializedName: "PoStProof",
        defaultValue: 0
      },
      proofBytes: {
        serializedName: "ProofBytes",
        defaultValue: Buffer.from([0])
      }
    };
  }

  postProof: number;
  proofBytes: Buffer;
}

type SerializedPoStProof = SerializedObject<PoStProofConfig>;

export { PoStProof, SerializedPoStProof };
