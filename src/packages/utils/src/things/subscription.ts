import Quantity from "./json-rpc/json-rpc-quantity";

export interface Subscription {
  id: Quantity;
  unsubscribe: () => void;
}
