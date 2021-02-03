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

type C = TicketConfig;

class Ticket extends SerializableObject<C> implements DeserializedObject<C> {
  get config(): Definitions<C> {
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
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.vrfProof = super.initializeValue(this.config.vrfProof, options);
  }

  vrfProof: Buffer;
}

type SerializedTicket = SerializedObject<C>;

export { Ticket, SerializedTicket };
