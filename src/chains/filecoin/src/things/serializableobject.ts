import SerializableLiteral from "./serializableliteral";

// Stolen from here: https://stackoverflow.com/questions/35074365/typescript-interface-default-values
abstract class SerializableObject<D, S> {

  constructor(options: D | S = {} as D) {
    let defaults: D;

    if (options instanceof SerializableObject) {
      defaults = this.defaults(options.toJSON() as S);
    } else {
      defaults = this.defaults(options as S);
    }

    Object.assign(this, defaults, options);
  }

  toJSON():S {
    let returnVal = ({} as S);

    Object.keys(this).forEach((deserializedKey) => {
      let item = {};

      const availableKeys = this.keyMapping();
      const serializedKey = availableKeys[deserializedKey] as string;

      if (!serializedKey) {
        return;
      }

      const value:any = this[deserializedKey];
      
      if (value instanceof SerializableObject) {
        item[serializedKey] = (value as SerializableObject<any, any>).toJSON();
      } else if (value instanceof SerializableLiteral) {
        item = (value as SerializableLiteral<any>).toJSON();
      } else {
        item = value;
      }

      returnVal[serializedKey] = item;
    });

    return returnVal;
  }

  abstract defaults(options: S): D;
  abstract keyMapping(): Record<keyof D, keyof S>;
}

export {
  SerializableObject
} ;