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
declare type C = PoStProofConfig;
declare class PoStProof
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  postProof: number;
  proofBytes: Buffer;
}
declare type SerializedPoStProof = SerializedObject<C>;
export { PoStProof, SerializedPoStProof };
