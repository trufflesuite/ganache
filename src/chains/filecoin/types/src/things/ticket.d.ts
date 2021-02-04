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
declare type C = TicketConfig;
declare class Ticket
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  vrfProof: Buffer;
}
declare type SerializedTicket = SerializedObject<C>;
export { Ticket, SerializedTicket };
