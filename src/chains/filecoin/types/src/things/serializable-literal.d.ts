/// <reference types="node" />
import { Serializable } from "./serializable-object";
declare type BaseConfig = {
  type: number | string | Buffer | bigint | null;
};
declare type Literal<C extends BaseConfig> = C["type"];
declare type SerializedLiteral<C extends BaseConfig> = C["type"] extends
  | bigint
  | Buffer
  ? string
  : Literal<C>;
declare type DefaultValue<S, D> = D | ((options: S | undefined) => D);
declare type LiteralDefinition<C extends BaseConfig> = {
  defaultValue?: DefaultValue<SerializedLiteral<C>, Literal<C>>;
};
declare abstract class SerializableLiteral<C extends BaseConfig>
  implements Serializable<SerializedLiteral<C>> {
  protected abstract get config(): LiteralDefinition<C>;
  value: Literal<C>;
  constructor(literal?: SerializedLiteral<C>);
  private initialize;
  serialize(): SerializedLiteral<C>;
  equals(obj: Serializable<Literal<C>>): boolean;
}
export { SerializableLiteral, LiteralDefinition, Literal };
