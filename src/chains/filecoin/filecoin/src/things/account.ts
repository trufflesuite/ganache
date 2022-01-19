import { RandomNumberGenerator } from "@ganache/utils";
import {
  Address,
  AddressProtocol,
  SerializedAddress,
  AddressNetwork
} from "./address";
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

class Account
  extends SerializableObject<AccountConfig>
  implements DeserializedObject<AccountConfig> {
  get config(): Definitions<AccountConfig> {
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
    rng: RandomNumberGenerator = new RandomNumberGenerator(),
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Account {
    return new Account({
      address: Address.random(rng, protocol, network),
      balance: new Balance(
        Balance.FILToLowestDenomination(defaultFIL).toString()
      ),
      nonce: 0
    });
  }

  constructor(
    options?:
      | Partial<SerializedObject<AccountConfig>>
      | Partial<DeserializedObject<AccountConfig>>
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

type SerializedAccount = SerializedObject<AccountConfig>;

export { Account, AccountConfig, SerializedAccount };
