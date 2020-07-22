import { SerializableObject } from "./serializableobject";

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

  keyMapping():Record<keyof WinPoStProofParameters, keyof SerializedWinPoStProofParameters> {
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