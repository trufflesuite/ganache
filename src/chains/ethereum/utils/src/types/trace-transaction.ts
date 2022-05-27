import { Data } from "@ganache/utils";
import { ITraceData } from "../things/trace-data";
import { TraceStorageMap } from "../things/trace-storage-map";

export type TraceTransactionOptions = {
  disableStorage?: boolean;
  disableMemory?: boolean;
  disableStack?: boolean;
};

export type StructLog = {
  depth: number;
  error: string;
  gas: number;
  gasCost: number;
  memory: Array<ITraceData>;
  op: string;
  pc: number;
  stack: Array<ITraceData>;
  storage: TraceStorageMap;
};

export type TraceTransactionResult = {
  gas: number;
  structLogs: StructLog[];
  returnValue: string;
  storage: Record<
    string,
    {
      key: Data;
      value: Data;
    }
  >;
};
