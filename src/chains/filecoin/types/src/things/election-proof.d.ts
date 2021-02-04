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
declare type C = ElectionProofConfig;
declare class ElectionProof
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  winCount: number;
  vrfProof: Buffer;
}
declare type SerializedElectionProof = SerializedObject<C>;
export { ElectionProof, SerializedElectionProof };
