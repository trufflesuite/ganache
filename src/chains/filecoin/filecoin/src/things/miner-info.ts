import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { Address, SerializedAddress } from "./address";

type MinerInfoConfig = {
  properties: {
    owner: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Owner";
    };
    worker: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Worker";
    };
    newWorker: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "NewWorker";
    };
    controlAddresses: {
      type: Address[];
      serializedType: SerializedAddress[];
      serializedName: "ControlAddresses";
    };
    workerChangeEpoch: {
      type: bigint;
      serializedType: string;
      serializedName: "WorkerChangeEpoch";
    };
    peerId: {
      type: string;
      serializedType: string;
      serializedName: "PeerId";
    };
    multiaddrs: {
      type: Uint8Array[];
      serializedType: Uint8Array[];
      serializedName: "Multiaddrs";
    };
    sealProofType: {
      type: bigint;
      serializedType: string;
      serializedName: "SealProofType";
    };
    sectorSize: {
      type: bigint;
      serializedType: string;
      serializedName: "SectorSize";
    };
    windowPoStPartitionSectors: {
      type: bigint;
      serializedType: string;
      serializedName: "WindowPoStPartitionSectors";
    };
    consensusFaultElapsed: {
      type: bigint;
      serializedType: string;
      serializedName: "ConsensusFaultElapsed";
    };
  };
};

class MinerInfo
  extends SerializableObject<MinerInfoConfig>
  implements DeserializedObject<MinerInfoConfig> {
  get config(): Definitions<MinerInfoConfig> {
    return {
      owner: {
        serializedName: "Owner",
        defaultValue: Address.random()
      },
      worker: {
        serializedName: "Worker",
        defaultValue: Address.random()
      },
      newWorker: {
        serializedName: "NewWorker",
        defaultValue: Address.random()
      },
      controlAddresses: {
        serializedName: "ControlAddresses",
        defaultValue: [Address.random()]
      },
      workerChangeEpoch: {
        serializedName: "WorkerChangeEpoch",
        defaultValue: config => (config ? BigInt(config) : 0n)
      },
      peerId: {
        serializedName: "PeerId",
        defaultValue: "0"
      },
      multiaddrs: {
        serializedName: "Multiaddrs",
        defaultValue: [new Uint8Array()]
      },
      sealProofType: {
        serializedName: "SealProofType",
        defaultValue: config => (config ? BigInt(config) : 0n) // not sure what to put here
      },
      sectorSize: {
        serializedName: "SectorSize",
        defaultValue: 18446744073709551615n // max from https://bit.ly/2XJItAg
      },
      windowPoStPartitionSectors: {
        serializedName: "WindowPoStPartitionSectors",
        defaultValue: config => (config ? BigInt(config) : 0n) // not sure what to put here
      },
      consensusFaultElapsed: {
        serializedName: "ConsensusFaultElapsed",
        defaultValue: config => (config ? BigInt(config) : 0n) // not sure what to put here
      }
    };
  }

  owner: Address;
  worker: Address;
  newWorker: Address;
  controlAddresses: Address[];
  workerChangeEpoch: bigint;
  peerId: string;
  multiaddrs: Uint8Array[];
  sealProofType: bigint;
  sectorSize: bigint;
  windowPoStPartitionSectors: bigint;
  consensusFaultElapsed: bigint;
}

type SerializedMinerInfo = SerializedObject<MinerInfoConfig>;

export { MinerInfo, SerializedMinerInfo };
