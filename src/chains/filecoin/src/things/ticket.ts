import { SerializableObject } from "./serializableobject";
import { KnownKeys } from "@ganache/utils/src/types";

interface TicketParameters {
  vrfProof: string;
}

interface SerializedTicketParameters {
  VRFProof: string;
}

class Ticket extends SerializableObject<TicketParameters, SerializedTicketParameters>{

  defaults(options:SerializedTicketParameters):TicketParameters {
    return {
      vrfProof: "tPnuOjWp9LS/w5VuB+ALc0wn+0aNRF9SkOSykAszkppjnSYGY1qFhhI2fI7PvS39FufkkH8AKCqctU23D4EkAKqZvnMEp8eVjy528BPWE394/n2Z4pJCgjHau2bK26vN"
    }
  }

  serializedKeys():Record<KnownKeys<TicketParameters>, KnownKeys<SerializedTicketParameters>>{
    return {
      vrfProof: "VRFProof"
    }
  }
}

export {
  Ticket,
  TicketParameters,
  SerializedTicketParameters
};