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

type StorageProposalConfig = {
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

class StorageProposal
  extends SerializableObject<StorageProposalConfig>
  implements DeserializedObject<StorageProposalConfig> {
  get config(): Definitions<StorageProposalConfig> {
    return {
      data: {
        serializedName: "Data",
        defaultValue: options => new StorageProposalData(options)
      },
      wallet: {
        serializedName: "Wallet"
      },
      miner: {
        serializedName: "Miner"
      },
      epochPrice: {
        serializedName: "EpochPrice",
        defaultValue: "2500"
      },
      minBlocksDuration: {
        serializedName: "MinBlocksDuration",
        defaultValue: 300
      }
    };
  }

  data: StorageProposalData;
  wallet: Address;
  miner: Miner;
  epochPrice: string;
  minBlocksDuration: number;
}

type SerializedStorageProposal = SerializedObject<StorageProposalConfig>;

export { StorageProposal, SerializedStorageProposal };
