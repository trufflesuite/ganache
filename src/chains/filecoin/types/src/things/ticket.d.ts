/// <reference types="node" />
import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";
interface TicketConfig {
  properties: {
    vrfProof: {
      type: Buffer;
      serializedType: string;
      serializedName: "VRFProof";
    };
  };
}
declare class Ticket
  extends SerializableObject<TicketConfig>
  implements DeserializedObject<TicketConfig> {
  get config(): Definitions<TicketConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<TicketConfig>>
      | Partial<DeserializedObject<TicketConfig>>
  );
  vrfProof: Buffer;
}
declare type SerializedTicket = SerializedObject<TicketConfig>;
export { Ticket, SerializedTicket };
