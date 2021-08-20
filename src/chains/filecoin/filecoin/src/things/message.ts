import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#Message

type MessageConfig = {
  properties: {
    version: {
      type: number;
      serializedType: number;
      serializedName: "Version";
    };
    to: {
      type: string;
      serializedType: string;
      serializedName: "To";
    };
    from: {
      type: string;
      serializedType: string;
      serializedName: "From";
    };
    nonce: {
      type: number;
      serializedType: number;
      serializedName: "Nonce";
    };
    value: {
      type: bigint;
      serializedType: string;
      serializedName: "Value";
    };
    gasLimit: {
      type: number;
      serializedType: number;
      serializedName: "GasLimit";
    };
    gasFeeCap: {
      type: bigint;
      serializedType: string;
      serializedName: "GasFeeCap";
    };
    gasPremium: {
      type: bigint;
      serializedType: string;
      serializedName: "GasPremium";
    };
    method: {
      type: number;
      serializedType: number;
      serializedName: "Method";
    };
    params: {
      type: Buffer;
      serializedType: string;
      serializedName: "Params";
    };
  };
};

class Message
  extends SerializableObject<MessageConfig>
  implements DeserializedObject<MessageConfig> {
  get config(): Definitions<MessageConfig> {
    return {
      version: {
        deserializedName: "version",
        serializedName: "Version",
        defaultValue: 0
      },
      to: {
        deserializedName: "to",
        serializedName: "To",
        defaultValue: ""
      },
      from: {
        deserializedName: "from",
        serializedName: "From",
        defaultValue: ""
      },
      nonce: {
        deserializedName: "nonce",
        serializedName: "Nonce",
        defaultValue: 0
      },
      value: {
        deserializedName: "value",
        serializedName: "Value",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      gasLimit: {
        deserializedName: "gasLimit",
        serializedName: "GasLimit",
        defaultValue: 0 // this gets updated in Blockchain if 0
      },
      gasFeeCap: {
        deserializedName: "gasFeeCap",
        serializedName: "GasFeeCap",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      gasPremium: {
        deserializedName: "gasPremium",
        serializedName: "GasPremium",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      method: {
        deserializedName: "method",
        serializedName: "Method",
        defaultValue: 0
      },
      params: {
        deserializedName: "params",
        serializedName: "Params",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal)
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<MessageConfig>>
      | Partial<DeserializedObject<MessageConfig>>
  ) {
    super();

    this.version = super.initializeValue(this.config.version, options);
    this.to = super.initializeValue(this.config.to, options);
    this.from = super.initializeValue(this.config.from, options);
    this.nonce = super.initializeValue(this.config.nonce, options);
    this.value = super.initializeValue(this.config.value, options);
    this.gasLimit = super.initializeValue(this.config.gasLimit, options);
    this.gasFeeCap = super.initializeValue(this.config.gasFeeCap, options);
    this.gasPremium = super.initializeValue(this.config.gasPremium, options);
    this.method = super.initializeValue(this.config.method, options);
    this.params = super.initializeValue(this.config.params, options);
  }

  version: number;
  to: string;
  from: string;
  nonce: number;
  value: bigint;
  gasLimit: number;
  gasFeeCap: bigint;
  gasPremium: bigint;
  method: number;
  params: Buffer;
}

type SerializedMessage = SerializedObject<MessageConfig>;

export { Message, SerializedMessage };
