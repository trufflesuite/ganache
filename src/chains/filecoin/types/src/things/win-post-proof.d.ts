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
declare class WinPoStProof
  extends SerializableObject<WinPoStProofConfig>
  implements DeserializedObject<WinPoStProofConfig> {
  get config(): Definitions<WinPoStProofConfig>;
  postProof: number;
  proofBytes: string;
}
declare type SerializedWinPoStProof = SerializedObject<WinPoStProofConfig>;
export { WinPoStProof, SerializedWinPoStProof };
