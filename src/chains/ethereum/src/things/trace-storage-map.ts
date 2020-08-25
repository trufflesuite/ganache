import TraceData from "./trace-data";

class TraceStorageMap extends Map<TraceData, TraceData> {
  toJSON(): Record<string, TraceData> {
    let obj: Record<string, TraceData> = {};

    for (const [key, value] of this.entries()) {
      obj[key.toString()] = value;
    }

    return obj;
  }
}

export default TraceStorageMap;
