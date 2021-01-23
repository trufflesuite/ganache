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
declare class ElectionProof
  extends SerializableObject<ElectionProofConfig>
  implements DeserializedObject<ElectionProofConfig> {
  get config(): Definitions<ElectionProofConfig>;
  vrfProof: string;
}
declare type SerializedElectionProof = SerializedObject<ElectionProofConfig>;
export { ElectionProof, SerializedElectionProof };
