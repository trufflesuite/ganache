import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus/chain/types#Ticket

interface TicketConfig {
  properties: {
    vrfProof: {
      type: string; // probably should be uint8array https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#Ticket
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
