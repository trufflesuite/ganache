import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#ElectionProof

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

type C = ElectionProofConfig;

class ElectionProof
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      winCount: {
        deserializedName: "winCount",
        serializedName: "WinCount",
        defaultValue: 1
      },
      vrfProof: {
        deserializedName: "vrfProof",
        serializedName: "VRFProof",
        defaultValue: literal =>
          literal ? Buffer.from(literal, "base64") : Buffer.from([0])
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.winCount = super.initializeValue(this.config.winCount, options);
    this.vrfProof = super.initializeValue(this.config.vrfProof, options);
  }

  winCount: number;
  vrfProof: Buffer;
}

type SerializedElectionProof = SerializedObject<C>;

export { ElectionProof, SerializedElectionProof };
