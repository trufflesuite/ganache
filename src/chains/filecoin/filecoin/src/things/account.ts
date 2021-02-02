import { RandomNumberGenerator } from "@ganache/utils/src/utils";
import { Address, SerializedAddress } from "./address";
import { Balance, SerializedBalance } from "./balance";
import {
  Definitions,
  DeserializedObject,
  SerializableObject,
  SerializedObject
} from "./serializable-object";

// This is not a Filecoin type; this is used for Ganache stuff, but uses the
// same structure as the Filecoin types for easy (de)-serialization for persistence

type AccountConfig = {
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

type C = AccountConfig;

class Account extends SerializableObject<C> implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      address: {
        deserializedName: "address",
        serializedName: "Address",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.random()
      },
      balance: {
        deserializedName: "balance",
        serializedName: "Balance",
        defaultValue: literal =>
          literal ? new Balance(literal) : new Balance("0")
      },
      nonce: {
        deserializedName: "nonce",
        serializedName: "Nonce",
        defaultValue: 0
      }
    };
  }

  static random(
    defaultFIL: number,
    rng: RandomNumberGenerator = new RandomNumberGenerator()
  ): Account {
    return new Account({
      address: Address.random(rng),
      balance: new Balance(
        Balance.FILToLowestDenomination(defaultFIL).toString()
      ),
      nonce: 0
    });
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.address = super.initializeValue(this.config.address, options);
    this.#balance = super.initializeValue(this.config.balance, options);
    this.nonce = super.initializeValue(this.config.nonce, options);
  }

  addBalance(val: string | number | bigint): void {
    this.#balance.add(val);
  }

  subtractBalance(val: string | number | bigint): void {
    this.#balance.sub(val);
  }

  readonly address: Address;
  #balance: Balance;
  nonce: number;

  get balance(): Balance {
    return this.#balance;
  }
}

type SerializedAccount = SerializedObject<C>;

export { Account, AccountConfig, SerializedAccount };
