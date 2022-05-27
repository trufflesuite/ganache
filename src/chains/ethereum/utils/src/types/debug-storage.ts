import { Data } from "@ganache/utils";

export type StorageRecords = Record<
  string,
  {
    key: Data;
    value: Data;
  }
>;

export type StorageRangeAtResult = {
  nextKey: Data | null;
  storage: StorageRecords;
};

export type StorageKeys = Map<string, { key: Buffer; hashedKey: Buffer }>;

export type RangedStorageKeys = { keys: Buffer[]; nextKey: Data };
