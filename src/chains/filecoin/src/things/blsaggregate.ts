import { SerializableObject } from "./serializableobject";

interface BLSAggregateParameters {
  type: number;
  data: string;
}

interface SerializedBLSAggregateParameters {
  Type: number;
  Data: string;
}

class BLSAggregate extends SerializableObject<BLSAggregateParameters, SerializedBLSAggregateParameters> {
  defaults(options:SerializedBLSAggregateParameters):BLSAggregateParameters {
    // Data taken from a real block
    return {
      type: 2,
      data: "wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    }
  }

  keyMapping():Record<keyof BLSAggregateParameters, keyof SerializedBLSAggregateParameters> {
    return {
      type: "Type", 
      data: "Data"
    }
  }
}

export {
  BLSAggregate,
  BLSAggregateParameters,
  SerializedBLSAggregateParameters
};