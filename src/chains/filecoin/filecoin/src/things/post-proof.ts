import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/specs-actors@v0.9.13/actors/runtime/proof#PoStProof

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
        deserializedName: "postProof",
        serializedName: "PoStProof",
        defaultValue: 0
      },
      proofBytes: {
        deserializedName: "proofBytes",
        serializedName: "ProofBytes",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<PoStProofConfig>>
      | Partial<DeserializedObject<PoStProofConfig>>
  ) {
    super();

    this.postProof = super.initializeValue(this.config.postProof, options);
    this.proofBytes = super.initializeValue(this.config.proofBytes, options);
  }

  postProof: number;
  proofBytes: Buffer;
}

type SerializedPoStProof = SerializedObject<PoStProofConfig>;

export { PoStProof, SerializedPoStProof };
