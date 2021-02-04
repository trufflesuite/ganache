import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type MinerInfoConfig = {
  properties: {
    owner: {
      type: string;
      serializedType: string;
      serializedName: "Owner";
    };
    worker: {
      type: string;
      serializedType: string;
      serializedName: "Worker";
    };
    newWorker: {
      type: string;
      serializedType: string;
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
declare type C = MinerInfoConfig;
declare class MinerInfo
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  /**
   * The owner address corresponds to a Lotus node address provided during the miner initialization.
   */
  owner: string;
  /**
   * The worker address is used to send and pay for day-to-day operations performed by the miner.
   */
  worker: string;
  newWorker: string;
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
declare type SerializedMinerInfo = SerializedObject<C>;
export { MinerInfo, SerializedMinerInfo };
