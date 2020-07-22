import { KnownKeys } from "@ganache/utils/src/types";

// Stolen from here: https://stackoverflow.com/questions/35074365/typescript-interface-default-values
abstract class SerializableObject<D, S> {
  data: D;

  constructor(options: D | S) {
    const defaults: D = this.defaults(options);

    Object.assign(this, defaults, options);
  }

  toJSON():S {
    let returnVal = ({} as S);

    Object.keys(this).forEach((deserializedKey) => {
      let item = {};

      const availableKeys = this.serializedKeys();
      const serializedKey = availableKeys[deserializedKey] as string;

      if (!serializedKey) {
        return;
      }

      const value:any = this[deserializedKey];
      
      if (value instanceof SerializableObject) {
        item[serializedKey] = (value as SerializableObject<any, any>).toJSON();
      } else {
        item = value;
      }

      return item;
    });

    return returnVal;
  }

  abstract defaults(options: D | S): D;
  abstract serializedKeys(): Record<KnownKeys<D>, KnownKeys<S>>;

  keys: Record<KnownKeys<D>, KnownKeys<S>>;
}

export {
  SerializableObject
} ;