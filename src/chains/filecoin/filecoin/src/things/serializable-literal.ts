import { Serializable } from "./serializable-object";

type BaseConfig = {
  type: any;
};

type Literal<C extends BaseConfig> = C["type"];

type SerializedLiteral<C extends BaseConfig> = C["type"] extends bigint
  ? string
  : Literal<C>;

type DefaultValue<D> = D | ((options: D) => D);

type LiteralDefinition<C extends BaseConfig> = {
  defaultValue?: DefaultValue<Literal<C>>;
  required?: boolean;
};

abstract class SerializableLiteral<C extends BaseConfig>
  implements Serializable<SerializedLiteral<C>> {
  protected abstract get config(): LiteralDefinition<C>;
  value: Literal<C>;

  constructor(literal?: Literal<C>) {
    this.initialize(literal);
  }

  private initialize(literal: Literal<C>) {
    if (this.config.defaultValue && literal === undefined) {
      const def = this.config.defaultValue;

      if (typeof def == "function") {
        this.value = (def as any)(literal);
      } else {
        this.value = def;
      }
    } else {
      this.value = literal;
    }

    if (this.config.required && typeof this.value == "undefined") {
      throw new Error(`A value is required for class ${this.constructor.name}`);
    }
  }

  serialize(): SerializedLiteral<C> {
    if (typeof this.value === "bigint") {
      return this.value.toString(10) as SerializedLiteral<C>;
    } else {
      return this.value;
    }
  }

  equals(obj: Serializable<Literal<C>>): boolean {
    let a: Literal<C> = this.serialize();
    let b: Literal<C> = obj.serialize();

    return a == b;
  }
}

export { SerializableLiteral, LiteralDefinition, Literal };
