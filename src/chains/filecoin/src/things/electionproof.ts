import { SerializableObject } from "./serializableobject";
import { KnownKeys } from "@ganache/utils/src/types";

interface ElectionProofParameters {
  vrfProof: string;
}

interface SerializedElectionProofParameters {
  VRFProof: string;
}

class ElectionProof extends SerializableObject<ElectionProofParameters, SerializedElectionProofParameters> {
  defaults(options:ElectionProofParameters):ElectionProofParameters {
    return {
      vrfProof: "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX"
    };
  }

  serializedKeys():Record<KnownKeys<ElectionProofParameters>, KnownKeys<SerializedElectionProofParameters>> {
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