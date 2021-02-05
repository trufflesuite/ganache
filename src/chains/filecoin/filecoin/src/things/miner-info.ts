import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RegisteredSealProof } from "../types/registered-seal-proof";
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/actors/builtin/miner#MinerInfo

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
      type: string[];
      serializedType: string[];
      serializedName: "ControlAddresses";
    };
    workerChangeEpoch: {
      type: number;
      serializedType: number;
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
      type: number;
      serializedType: number;
      serializedName: "SealProofType";
    };
    sectorSize: {
      type: number;
      serializedType: number;
      serializedName: "SectorSize";
    };
    windowPoStPartitionSectors: {
      type: number;
      serializedType: number;
      serializedName: "WindowPoStPartitionSectors";
    };
    consensusFaultElapsed: {
      type: number;
      serializedType: number;
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
        deserializedName: "owner",
        serializedName: "Owner",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      worker: {
        deserializedName: "worker",
        serializedName: "Worker",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      newWorker: {
        deserializedName: "newWorker",
        serializedName: "NewWorker",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      controlAddresses: {
        deserializedName: "controlAddresses",
        serializedName: "ControlAddresses",
        defaultValue: []
      },
      workerChangeEpoch: {
        deserializedName: "workerChangeEpoch",
        serializedName: "WorkerChangeEpoch",
        defaultValue: config => (typeof config !== "undefined" ? config : -1)
      },
      peerId: {
        deserializedName: "peerId",
        serializedName: "PeerId",
        defaultValue: "0" // defaulting this to 0 as we don't have any p2p technology in Ganache
      },
      multiaddrs: {
        deserializedName: "multiaddrs",
        serializedName: "Multiaddrs",
        defaultValue: []
      },
      sealProofType: {
        deserializedName: "sealProofType",
        serializedName: "SealProofType",
        defaultValue: config =>
          typeof config !== "undefined"
            ? config
            : RegisteredSealProof.StackedDrg2KiBV1_1
      },
      sectorSize: {
        deserializedName: "sectorSize",
        serializedName: "SectorSize",
        defaultValue: 2048 // sectors/sector sizes don't really matter in Ganache; defaulting to 2 KiB (lotus-devnet default)
      },
      windowPoStPartitionSectors: {
        deserializedName: "windowPoStPartitionSectors",
        serializedName: "WindowPoStPartitionSectors",
        defaultValue: config => (typeof config !== "undefined" ? config : 0)
      },
      consensusFaultElapsed: {
        deserializedName: "consensusFaultElapsed",
        serializedName: "ConsensusFaultElapsed",
        defaultValue: config => (typeof config !== "undefined" ? config : -1)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<MinerInfoConfig>>
      | Partial<DeserializedObject<MinerInfoConfig>>
  ) {
    super();

    this.owner = super.initializeValue(this.config.owner, options);
    this.worker = super.initializeValue(this.config.worker, options);
    this.newWorker = super.initializeValue(this.config.newWorker, options);
    this.controlAddresses = super.initializeValue(
      this.config.controlAddresses,
      options
    );
    this.workerChangeEpoch = super.initializeValue(
      this.config.workerChangeEpoch,
      options
    );
    this.peerId = super.initializeValue(this.config.peerId, options);
    this.multiaddrs = super.initializeValue(this.config.multiaddrs, options);
    this.sealProofType = super.initializeValue(
      this.config.sealProofType,
      options
    );
    this.sectorSize = super.initializeValue(this.config.sectorSize, options);
    this.windowPoStPartitionSectors = super.initializeValue(
      this.config.windowPoStPartitionSectors,
      options
    );
    this.consensusFaultElapsed = super.initializeValue(
      this.config.consensusFaultElapsed,
      options
    );
  }

  /**
   * The owner address corresponds to a Lotus node address provided during the miner initialization.
   */
  owner: Address;
  /**
   * The worker address is used to send and pay for day-to-day operations performed by the miner.
   */
  worker: Address;
  newWorker: Address;
  /**
   * Control addresses are used to submit WindowPoSts proofs to the chain (unused by Ganache).
   */
  controlAddresses: string[];
  /**
   * The epoch time that `worker` becomes `newWorker`. A value of -1 indicates no change.
   */
  workerChangeEpoch: number;
  peerId: string;
  multiaddrs: Uint8Array[];
  sealProofType: number;
  sectorSize: number;
  windowPoStPartitionSectors: number;
  consensusFaultElapsed: number;
}

type SerializedMinerInfo = SerializedObject<MinerInfoConfig>;

export { MinerInfo, SerializedMinerInfo };
