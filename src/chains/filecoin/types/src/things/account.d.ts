import { RandomNumberGenerator } from "@ganache/utils/src/utils";
import { Address, SerializedAddress } from "./address";
import { Balance, SerializedBalance } from "./balance";
import {
  Definitions,
  DeserializedObject,
  SerializableObject,
  SerializedObject
} from "./serializable-object";
declare type AccountConfig = {
  properties: {
    address: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Address";
    };
    balance: {
      type: Balance;
      serializedType: SerializedBalance;
      serializedName: "Balance";
    };
    nonce: {
      type: number;
      serializedType: number;
      serializedName: "Nonce";
    };
  };
};
declare type C = AccountConfig;
declare class Account
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  #private;
  get config(): Definitions<C>;
  static random(defaultFIL: number, rng?: RandomNumberGenerator): Account;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  addBalance(val: string | number | bigint): void;
  subtractBalance(val: string | number | bigint): void;
  readonly address: Address;
  nonce: number;
  get balance(): Balance;
}
declare type SerializedAccount = SerializedObject<C>;
export { Account, AccountConfig, SerializedAccount };
