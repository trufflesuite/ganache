import { SerializableObject } from "./serializableobject";
import { SerializedBLSAggregateParameters } from "./blsaggregate";

interface BeaconEntryParameters {
  round: number;
  data: string;
}

interface SerializedBeaconEntryParameters {
  Round: number;
  Data: string;
}

class BeaconEntry extends SerializableObject<BeaconEntryParameters, SerializedBeaconEntryParameters>{
  defaults(options:SerializedBeaconEntryParameters):BeaconEntryParameters {
    return {
      round: 1321,
      data: "qrwddPErWZxCQkTKvTkgKwxazkKZu2Q9nXHW1sPgW7I="
    }
  }

  keyMapping():Record<keyof BeaconEntryParameters, keyof SerializedBeaconEntryParameters> {
    return {
      round: "Round",
      data: "Data"
    }
  }
}

export {
  BeaconEntry,
  BeaconEntryParameters,
  SerializedBeaconEntryParameters
};