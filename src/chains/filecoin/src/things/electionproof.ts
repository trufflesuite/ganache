import { SerializableObject } from "./serializableobject";

interface ElectionProofParameters {
  vrfProof: string;
}

interface SerializedElectionProofParameters {
  VRFProof: string;
}

class ElectionProof extends SerializableObject<ElectionProofParameters, SerializedElectionProofParameters> {
  defaults(options:SerializedElectionProofParameters):ElectionProofParameters {
    return {
      vrfProof: "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX"
    };
  }

  keyMapping():Record<keyof ElectionProofParameters, keyof SerializedElectionProofParameters> {
    return {
      vrfProof: "VRFProof"
    }
  }
}

export {
  ElectionProof,
  ElectionProofParameters, 
  SerializedElectionProofParameters
};