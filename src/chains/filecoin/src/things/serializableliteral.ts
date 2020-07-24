import { Serializable } from "./serializableobject"; 
import { config } from "yargs";

type BaseConfig = {
  type: any;
}

type Literal<C extends BaseConfig> = C["type"];

type DefaultValue<D> =
  | D
  | ((options:D) => D);

type LiteralDefinition<C extends BaseConfig> = {
  defaultValue: DefaultValue<Literal<C>>;
}

abstract class SerializableLiteral<C extends BaseConfig> implements Serializable<Literal<C>> {
  protected abstract get config (): LiteralDefinition<C>;
  value: Literal<C>;

  constructor(literal?:Literal<C>) {
    this.initialize(literal);
  }

  private initialize(literal:Literal<C>) {
    if (this.config.defaultValue && literal === undefined) {
      const def = this.config.defaultValue;

      if (typeof def == "function") {
        this.value = def(literal);
      } else {
        this.value = def;
      }
    } else {
      this.value = literal;
    }
  }

  serialize():Literal<C> {
    return this.value;
  }
}

export {
  SerializableLiteral,
  LiteralDefinition,
  Literal
};