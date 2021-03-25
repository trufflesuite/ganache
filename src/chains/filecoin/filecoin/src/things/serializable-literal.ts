import { Serializable } from "./serializable-object";

type BaseConfig = {
  type: number | string | Buffer | bigint | null;
};

type Literal<C extends BaseConfig> = C["type"];

type SerializedLiteral<C extends BaseConfig> = C["type"] extends bigint | Buffer
  ? string
  : Literal<C>;

type DefaultValue<S, D> = D | ((options: S | undefined) => D);

type LiteralDefinition<C extends BaseConfig> = {
  defaultValue?: DefaultValue<SerializedLiteral<C>, Literal<C>>;
};

abstract class SerializableLiteral<C extends BaseConfig>
  implements Serializable<SerializedLiteral<C>> {
  protected abstract get config(): LiteralDefinition<C>;
  value: Literal<C>;

  constructor(literal?: SerializedLiteral<C>) {
    this.value = this.initialize(literal);
  }

  private initialize(literal?: SerializedLiteral<C>): Literal<C> {
    const def = this.config.defaultValue;
    if (typeof def === "function") {
      return def(literal);
    } else if (typeof literal !== "undefined") {
      return literal;
    } else if (typeof def !== "function" && typeof def !== "undefined") {
      return def;
    } else {
      throw new Error(`A value is required for class ${this.constructor.name}`);
    }
  }

  serialize(): SerializedLiteral<C> {
    if (typeof this.value === "bigint") {
      return this.value.toString(10) as SerializedLiteral<C>;
    } else if (Buffer.isBuffer(this.value)) {
      return this.value.toString("base64") as SerializedLiteral<C>;
    } else {
      return this.value as SerializedLiteral<C>;
    }
  }

  equals(obj: Serializable<Literal<C>>): boolean {
    const a: Literal<C> = this.serialize();
    const b: Literal<C> = obj.serialize();

    return a === b;
  }
}

export { SerializableLiteral, LiteralDefinition, Literal };
