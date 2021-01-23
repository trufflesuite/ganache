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
declare class Ticket
  extends SerializableObject<TicketConfig>
  implements DeserializedObject<TicketConfig> {
  get config(): Definitions<TicketConfig>;
  vrfProof: string;
}
declare type SerializedTicket = SerializedObject<TicketConfig>;
export { Ticket, SerializedTicket };
