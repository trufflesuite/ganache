import { Data, Quantity } from "@ganache/utils";

export type StorageProof = {
  key: Data;
  proof: Data[];
  value: Quantity;
};

export type AccountProof = {
  address: Data;
  balance: Quantity;
  codeHash: Data;
  nonce: Quantity;
  storageHash: Data;
  accountProof: Data[];
  storageProof: StorageProof[];
};
