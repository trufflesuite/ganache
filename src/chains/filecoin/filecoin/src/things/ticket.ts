import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#Ticket

interface TicketConfig {
  properties: {
    vrfProof: {
      type: Buffer;
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
        deserializedName: "vrfProof",
        serializedName: "VRFProof",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<TicketConfig>>
      | Partial<DeserializedObject<TicketConfig>>
  ) {
    super();

    this.vrfProof = super.initializeValue(this.config.vrfProof, options);
  }

  vrfProof: Buffer;
}

type SerializedTicket = SerializedObject<TicketConfig>;

export { Ticket, SerializedTicket };
