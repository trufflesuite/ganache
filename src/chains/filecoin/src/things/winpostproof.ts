import { SerializableObject } from "./serializableobject";
import { KnownKeys } from "@ganache/utils/src/types";


interface WinPoStProofParameters {
  postProof: number;
  proofBytes: string;
}

interface SerializedWinPoStProofParameters {
  PoStProof: number;
  ProofBytes: number;
}

class WinPoStProof extends SerializableObject<WinPoStProofParameters, SerializedWinPoStProofParameters> {
  defaults(options: SerializedWinPoStProofParameters):WinPoStProofParameters {
    return {
      postProof: 0,
      proofBytes: "dmFsaWQgcHJvb2Y="
    }
  }

  serializedKeys():Record<KnownKeys<WinPoStProofParameters>,KnownKeys<SerializedWinPoStProofParameters>> {
    return {
      postProof: "PoStProof",
      proofBytes: "ProofBytes"
    }
  }
}

export {
  WinPoStProof,
  WinPoStProofParameters,
  SerializedWinPoStProofParameters
}