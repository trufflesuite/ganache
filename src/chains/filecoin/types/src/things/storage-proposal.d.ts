import {
  StorageProposalData,
  SerializedStorageProposalData
} from "./storage-proposal-data";
import { Address, SerializedAddress } from "./address";
import { Miner, SerializedMiner } from "./miner";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
declare type StorageProposalConfig = {
  properties: {
    data: {
      type: StorageProposalData;
      serializedType: SerializedStorageProposalData;
      serializedName: "Data";
    };
    wallet: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Wallet";
    };
    miner: {
      type: Miner;
      serializedType: SerializedMiner;
      serializedName: "Miner";
    };
    epochPrice: {
      type: string;
      serializedType: string;
      serializedName: "EpochPrice";
    };
    minBlocksDuration: {
      type: number;
      serializedType: number;
      serializedName: "MinBlocksDuration";
    };
  };
};
declare class StorageProposal
  extends SerializableObject<StorageProposalConfig>
  implements DeserializedObject<StorageProposalConfig> {
  get config(): Definitions<StorageProposalConfig>;
  data: StorageProposalData;
  wallet: Address;
  miner: Miner;
  epochPrice: string;
  minBlocksDuration: number;
}
declare type SerializedStorageProposal = SerializedObject<StorageProposalConfig>;
export { StorageProposal, SerializedStorageProposal };
