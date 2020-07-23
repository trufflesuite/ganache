import { SerializableLiteral } from "./serializableliteral";


// provides shape
type BaseConfig = {
  properties: {
    // lowercase (deserialized)
    [deserializedName: string]: {
      type: any;
      serializedName: string;
      serializedType: any;
    }
  }
}
​
// PropertyName<C>, e.g. "cid" | "blsAggregate"
// N extends PropertyName<C>, e.g. "cid"
type PropertyName<C extends BaseConfig> =
  string & keyof C["properties"];
​
type SerializedPropertyName<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedName"];
​​
type PropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["type"];

type SerializedPropertyType<
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
> = C["properties"][N]["serializedType"];
​
type DeserializedObject<C extends BaseConfig> = {
  [N in PropertyName<C>]: PropertyType<C, N>
};
​
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
  }
}
​
interface Wrapper {
  [propertyName: string]: {
    [serializedPropertyName: string]: any;
  }
}
​
type Values<W extends Wrapper> = W[keyof W];
​
// this evil magic comes from https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = 
  (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never
​
// Flattens two union types into a single type with optional values
// i.e. FlattenUnion<{ a: number, c: number } | { b: string, c: number }> = { a?: number, b?: string, c: number }
// from https://www.roryba.in/programming/2019/10/12/flattening-typescript-union-types.html
type FlattenUnion<T> = {
    [K in keyof UnionToIntersection<T>]: K extends keyof T ?
    T[K] extends any[] ? T[K]
    : T[K] extends object ? FlattenUnion<T[K]>
    : T[K]
    : UnionToIntersection<T>[K]
}
​
type SerializedObject<C extends BaseConfig> = FlattenUnion<Values<SerializedObjectWrapper<C>>>;

type DefaultValue<D, S> =  // A default value can be:
  | D                      // the expected type
  | ((options:S) => D);    // a fn that takes in a serialized object and returns the type
​
type Definition<
  C extends BaseConfig,
  N extends PropertyName<C>
> = {
  serializedName: SerializedPropertyName<C, N>;
  defaultValue?: DefaultValue<PropertyType<C, N>, SerializedPropertyType<C, N>>;
}
​
// purpose of this type is to have a value
type Definitions<C extends BaseConfig> = {
  [N in PropertyName<C>]: Definition<C, N>;
}
​
// lives in value land
const serializePropertyName = <
  C extends BaseConfig,
  N extends PropertyName<C> = PropertyName<C>
>(
  definitions: Definitions<C>,
  name: N
): SerializedPropertyName<C, N> => definitions[name].serializedName;
​
// concrete stuff follows

interface Serializable<C> {
  serialize():C;
}

abstract class SerializableObject<C extends BaseConfig> implements Serializable<SerializedObject<C>> {
  protected abstract get config (): Definitions<C>;

  constructor(options:SerializedObject<C> = {} as SerializedObject<C>) {
    this.initialize(options);
  }

  private initialize(options:SerializedObject<C>):void {
    for (const [deserializedName, {serializedName}] of Object.entries(this.config)) {
      let def = this.config[deserializedName].defaultValue;

      if (def !== undefined) {
        if (typeof def == "function") {
          this[deserializedName] = def(options[serializedName]);
        } else {
          this[deserializedName] = def;
        }
      } else {
        this[deserializedName] = options[serializedName];
      }
    };
  }

  serialize():SerializedObject<C> {
    let returnVal:SerializedObject<C> = {} as SerializedObject<C>;

    for (const [deserializedName, {serializedName}] of Object.entries(this.config)) {
      let value = this[deserializedName];

      if (value instanceof SerializableObject || value instanceof SerializableLiteral) {
        value = value.serialize();
      }

      returnVal[serializedName] = value;
    }

    return returnVal;
  }
}

// interface BlockConfig {
//   properties: {
//     cid: {
//       serializedName: "Cid";
//       type: CID;
//       serializedType: string;
//     },
//     blsAggregate: {
//       serializedName: "BLSAggregate";
//       type: number;
//       serializedType: number;
//     }
//   }
// }
// const blockConfig: Definitions<BlockConfig> = {
//   cid: {
//     serializedName: "Cid",
//     defaultValue: () => ({ _cid: "hi" })
//   },
//   blsAggregate: {
//     serializedName: "BLSAggregate",
//   }
// };

// class Block extends SerializableObject<BlockConfig> implements DeserializedObject<BlockConfig>  {
//   #config: {
//     cid: {
//       serializedName: "Cid",
//       defaultValue: () => ({ _cid: "hi" })
//     },
//     blsAggregate: {
//       serializedName: "BLSAggregate",
//     }
//   }

//   cid: CID;
//   blsAggregate: number;
// }

// let b = new Block({
//   Cid: "hi",
//   BLSAggregate: 5
// })

export {
  Serializable,
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} ;

