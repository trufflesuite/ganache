import { Data } from "@ganache/utils";

type StorageRecord = {
  key: Data;
  value: Data;
};
export type StorageRecords = Record<string, StorageRecord>;

export type StorageRangeAtResult = {
  nextKey: Data | null;
  storage: StorageRecords;
};

export type StorageKeys = Map<string, { key: Buffer; hashedKey: Buffer }>;
