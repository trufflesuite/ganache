import { ITraceData } from "./trace-data";

class TraceStorageMap extends Map<ITraceData, ITraceData> {
  toJSON(): Record<string, ITraceData> {
    const obj: Record<string, ITraceData> = {};

    for (const [key, value] of this) {
      obj[key.toJSON()] = value;
    }

    return obj;
  }
}

export default TraceStorageMap;
