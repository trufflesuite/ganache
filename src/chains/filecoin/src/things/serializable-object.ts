import { SerializableLiteral } from "./serializable-literal";
import deepEqual from "deep-equal";

// provides shape
type BaseConfig = {
  properties: {
    // lowercase (deserialized)
    [deserializedName: string]: {
      type: any;
      serializedName: string;
      serializedType: any;
    };
  };
};
// PropertyName<C>, e.g. "cid" | "blsAggregate"
// N extends PropertyName<C>, e.g. "cid"
type PropertyName<C extends BaseConfig> = string & keyof C["properties"];
type SerializedPropertyName<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedName"];
type PropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["type"];

type SerializedPropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedType"];
type DeserializedObject<C extends BaseConfig> = {
  [N in PropertyName<C>]: PropertyType<C, N>;
};
/*
 * {
 *   cid: {
 *     Cid: CID
 *   }
 * }
 */
type SerializedObjectWrapper<C extends BaseConfig> = {
  [N in PropertyName<C>]: {
    [S in SerializedPropertyName<C, N>]: SerializedPropertyType<C, N>;
  };
};

interface Wrapper {
  [propertyName: string]: {
    [serializedPropertyName: string]: any;
  };
}
type Values<W extends Wrapper> = W[keyof W];
// this evil magic comes from https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
// Flattens two union types into a single type with optional values
// i.e. FlattenUnion<{ a: number, c: number } | { b: string, c: number }> = { a?: number, b?: string, c: number }
// from https://www.roryba.in/programming/2019/10/12/flattening-typescript-union-types.html
type FlattenUnion<T> = {
  [K in keyof UnionToIntersection<T>]: K extends keyof T
    ? T[K] extends any[]
      ? T[K]
      : T[K] extends object
      ? FlattenUnion<T[K]>
      : T[K]
    : UnionToIntersection<T>[K];
};
type SerializedObject<C extends BaseConfig> = FlattenUnion<
  Values<SerializedObjectWrapper<C>>
>;

type DefaultValue<D, S> =  // A default value can be:
  | D // the expected type
  | ((options: S) => D); // a fn that takes in a serialized object and returns the type
type Definition<C extends BaseConfig, N extends PropertyName<C>> = {
  serializedName: SerializedPropertyName<C, N>;
  defaultValue?: DefaultValue<PropertyType<C, N>, SerializedPropertyType<C, N>>;
  required?: boolean;
};
// purpose of this type is to have a value
type Definitions<C extends BaseConfig> = {
  [N in PropertyName<C>]: Definition<C, N>;
};
// lives in value land
const serializedPropertyName = <
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
>(
  definitions: Definitions<C>,
  name: N
): SerializedPropertyName<C, N> => definitions[name].serializedName;

// concrete stuff follows

interface Serializable<C> {
  serialize(): C;
  equals(obj: Serializable<C>): boolean;
}

abstract class SerializableObject<C extends BaseConfig>
  implements Serializable<SerializedObject<C>> {
  protected abstract get config(): Definitions<C>;

  // The constructor can take in a serialized object, or a deserialized one.
  // Note that SerializableObject is the deserialized object in value land.
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    this.initialize(options);
  }

  private initialize(
    options: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ): void {
    if (!options) {
      options = {} as SerializedObject<C>;
    }

    for (const [deserializedName, { serializedName }] of Object.entries(
      this.config
    )) {
      let def = this.config[deserializedName].defaultValue;
      let value: any;

      // We don't know whether we were passed a serialized object or a
      // deserialized one, so let's look for both keys.
      if (typeof options[deserializedName] != "undefined") {
        value = options[deserializedName];
      } else {
        value = options[serializedName];
      }

      // Ensure everything is serialized after this point,
      // as defaultValue functions expect serialized data
      value = this.serializeValue(value);

      this[deserializedName] = value;

      if (typeof def == "function") {
        // TODO: why the `(def as any)` here?
        this[deserializedName] = (def as any)(value);
      } else if (typeof value === "undefined") {
        this[deserializedName] = def;
      }

      if (
        this.config[deserializedName].required &&
        typeof this[deserializedName] == "undefined"
      ) {
        throw new Error(
          `${deserializedName} is required for class ${this.constructor.name}`
        );
      }
    }
  }

  private serializeValue(value: any) {
    let returnVal: any = value;
    if (
      value instanceof SerializableObject ||
      value instanceof SerializableLiteral
    ) {
      returnVal = value.serialize();
    } else if (value instanceof Array) {
      returnVal = value.map(item => this.serializeValue(item));
    }
    return returnVal;
  }

  serialize(): SerializedObject<C> {
    let returnVal: SerializedObject<C> = {} as SerializedObject<C>;

    for (const [deserializedName, { serializedName }] of Object.entries(
      this.config
    )) {
      let value = this[deserializedName];
      returnVal[serializedName] = this.serializeValue(value);
    }

    return returnVal;
  }

  equals(obj: Serializable<SerializedObject<C>>): boolean {
    let a: SerializedObject<C> = this.serialize();
    let b: SerializedObject<C> = obj.serialize();

    return deepEqual(a, b);
  }
}

export {
  Serializable,
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
};
