/// <reference types="node" />
import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";
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
declare class ElectionProof
  extends SerializableObject<ElectionProofConfig>
  implements DeserializedObject<ElectionProofConfig> {
  get config(): Definitions<ElectionProofConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<ElectionProofConfig>>
      | Partial<DeserializedObject<ElectionProofConfig>>
  );
  winCount: number;
  vrfProof: Buffer;
}
declare type SerializedElectionProof = SerializedObject<ElectionProofConfig>;
export { ElectionProof, SerializedElectionProof };
