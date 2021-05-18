import { SerializableLiteral } from "./serializable-literal";
import deepEqual from "deep-equal";
import { CID } from "./cid";
import cbor from "borc";
import { CID as IPFS_CID } from "ipfs";
import multihashing from "multihashing";
import multicodec from "multicodec";

// provides shape
export type BaseConfig = {
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
  | ((options?: S) => D); // a fn that takes in a serialized object and returns the type
type Definition<C extends BaseConfig, N extends PropertyName<C>> = {
  deserializedName: N;
  serializedName: SerializedPropertyName<C, N>;
  defaultValue: DefaultValue<PropertyType<C, N>, SerializedPropertyType<C, N>>;
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

  initializeValue<N extends PropertyName<C>>(
    valueConfig: Definition<C, N>,
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ): PropertyType<C, N> {
    if (!options) {
      options = {};
    }

    const def = valueConfig.defaultValue;

    // We don't know whether we were passed a serialized object or a
    // deserialized one, so let's look for both keys.
    const deserializedInput: PropertyType<C, N> | undefined = (options as any)[
      valueConfig.deserializedName
    ];
    const serializedInput:
      | SerializedPropertyType<C, N>
      | undefined = (options as any)[valueConfig.serializedName];

    if (typeof deserializedInput !== "undefined") {
      return deserializedInput;
    } else if (typeof def === "function") {
      const typedDef = def as (
        options?: SerializedPropertyType<C, N>
      ) => PropertyType<C, N>;
      return typedDef(serializedInput);
    } else if (typeof serializedInput !== "undefined") {
      return serializedInput;
    } else if (typeof def !== "function") {
      return def;
    } else {
      throw new Error(
        `A value is required for ${this.constructor.name}.${valueConfig.deserializedName}`
      );
    }
  }

  private serializeValue(value: any) {
    let returnVal: any = value;
    if (typeof value === "bigint") {
      returnVal = value.toString(10);
    } else if (Buffer.isBuffer(value)) {
      // golang serializes "byte[]" with base-64 encoding
      // https://golang.org/src/encoding/json/encode.go?s=6458:6501#L55
      returnVal = value.toString("base64");
    } else if (
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
    const returnVal: SerializedObject<C> = {} as SerializedObject<C>;

    for (const [deserializedName, { serializedName }] of Object.entries(
      this.config
    )) {
      const value = (this as any)[deserializedName];
      (returnVal as any)[serializedName] = this.serializeValue(value);
    }

    return returnVal;
  }

  equals(obj: Serializable<SerializedObject<C>>): boolean {
    const a: SerializedObject<C> = this.serialize();
    const b: SerializedObject<C> = obj.serialize();

    return deepEqual(a, b);
  }

  get cid(): CID {
    // We could have used the ipld-dag-cbor package for the following,
    // but it was async, which caused a number of issues during object construction.
    const cborBuffer = cbor.encode(this.serialize());
    const multihash = multihashing(cborBuffer, "blake2b-256");
    const rawCid = new IPFS_CID(
      1,
      multicodec.print[multicodec.DAG_CBOR],
      multihash
    );

    return new CID(rawCid.toString());
  }
}

export {
  Serializable,
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
};
