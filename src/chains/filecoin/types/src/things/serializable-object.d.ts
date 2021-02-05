export declare type BaseConfig = {
  properties: {
    [deserializedName: string]: {
      type: any;
      serializedName: string;
      serializedType: any;
    };
  };
};
declare type PropertyName<C extends BaseConfig> = string &
  keyof C["properties"];
declare type SerializedPropertyName<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedName"];
declare type PropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["type"];
declare type SerializedPropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedType"];
declare type DeserializedObject<C extends BaseConfig> = {
  [N in PropertyName<C>]: PropertyType<C, N>;
};
declare type SerializedObjectWrapper<C extends BaseConfig> = {
  [N in PropertyName<C>]: {
    [S in SerializedPropertyName<C, N>]: SerializedPropertyType<C, N>;
  };
};
interface Wrapper {
  [propertyName: string]: {
    [serializedPropertyName: string]: any;
  };
}
declare type Values<W extends Wrapper> = W[keyof W];
declare type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
declare type FlattenUnion<T> = {
  [K in keyof UnionToIntersection<T>]: K extends keyof T
    ? T[K] extends any[]
      ? T[K]
      : T[K] extends object
      ? FlattenUnion<T[K]>
      : T[K]
    : UnionToIntersection<T>[K];
};
declare type SerializedObject<C extends BaseConfig> = FlattenUnion<
  Values<SerializedObjectWrapper<C>>
>;
declare type DefaultValue<D, S> = D | ((options?: S) => D);
declare type Definition<C extends BaseConfig, N extends PropertyName<C>> = {
  deserializedName: N;
  serializedName: SerializedPropertyName<C, N>;
  defaultValue: DefaultValue<PropertyType<C, N>, SerializedPropertyType<C, N>>;
};
declare type Definitions<C extends BaseConfig> = {
  [N in PropertyName<C>]: Definition<C, N>;
};
interface Serializable<C> {
  serialize(): C;
  equals(obj: Serializable<C>): boolean;
}
declare abstract class SerializableObject<C extends BaseConfig>
  implements Serializable<SerializedObject<C>> {
  protected abstract get config(): Definitions<C>;
  initializeValue<N extends PropertyName<C>>(
    valueConfig: Definition<C, N>,
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ): PropertyType<C, N>;
  private serializeValue;
  serialize(): SerializedObject<C>;
  equals(obj: Serializable<SerializedObject<C>>): boolean;
}
export {
  Serializable,
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
};
