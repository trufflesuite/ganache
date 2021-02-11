/// <reference types="node" />
import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";
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
declare class PoStProof
  extends SerializableObject<PoStProofConfig>
  implements DeserializedObject<PoStProofConfig> {
  get config(): Definitions<PoStProofConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<PoStProofConfig>>
      | Partial<DeserializedObject<PoStProofConfig>>
  );
  postProof: number;
  proofBytes: Buffer;
}
declare type SerializedPoStProof = SerializedObject<PoStProofConfig>;
export { PoStProof, SerializedPoStProof };
