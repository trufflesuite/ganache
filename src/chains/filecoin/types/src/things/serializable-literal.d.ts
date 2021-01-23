import { Serializable } from "./serializable-object";
declare type BaseConfig = {
  type: any;
};
declare type Literal<C extends BaseConfig> = C["type"];
declare type DefaultValue<D> = D | ((options: D) => D);
declare type LiteralDefinition<C extends BaseConfig> = {
  defaultValue?: DefaultValue<Literal<C>>;
  required?: boolean;
};
declare abstract class SerializableLiteral<C extends BaseConfig>
  implements Serializable<Literal<C>> {
  protected abstract get config(): LiteralDefinition<C>;
  value: Literal<C>;
  constructor(literal?: Literal<C>);
  private initialize;
  serialize(): Literal<C>;
  equals(obj: Serializable<Literal<C>>): boolean;
}
export { SerializableLiteral, LiteralDefinition, Literal };
