import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

interface TicketConfig {
  properties: {
    vrfProof: {
      type: string;
      serializedType: string;
      serializedName: "VRFProof";
    };
  };
}

class Ticket
  extends SerializableObject<TicketConfig>
  implements DeserializedObject<TicketConfig> {
  get config(): Definitions<TicketConfig> {
    return {
      vrfProof: {
        serializedName: "VRFProof",
        defaultValue:
          "tPnuOjWp9LS/w5VuB+ALc0wn+0aNRF9SkOSykAszkppjnSYGY1qFhhI2fI7PvS39FufkkH8AKCqctU23D4EkAKqZvnMEp8eVjy528BPWE394/n2Z4pJCgjHau2bK26vN"
      }
    };
  }

  vrfProof: string;
}

type SerializedTicket = SerializedObject<TicketConfig>;

export { Ticket, SerializedTicket };
