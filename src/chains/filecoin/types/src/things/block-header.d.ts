import { Ticket, SerializedTicket } from "./ticket";
import { ElectionProof, SerializedElectionProof } from "./election-proof";
import { BeaconEntry, SerializedBeaconEntry } from "./beacon-entry";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { PoStProof, SerializedPoStProof } from "./post-proof";
import { RootCID, SerializedRootCID } from "./root-cid";
import { CID } from "./cid";
import { SerializedSignature, Signature } from "./signature";
interface BlockHeaderConfig {
  properties: {
    miner: {
      type: string;
      serializedType: string;
      serializedName: "Miner";
    };
    ticket: {
      type: Ticket;
      serializedType: SerializedTicket;
      serializedName: "Ticket";
    };
    electionProof: {
      type: ElectionProof;
      serializedType: SerializedElectionProof;
      serializedName: "ElectionProof";
    };
    beaconEntries: {
      type: Array<BeaconEntry>;
      serializedType: Array<SerializedBeaconEntry>;
      serializedName: "BeaconEntries";
    };
    winPoStProof: {
      type: Array<PoStProof>;
      serializedType: Array<SerializedPoStProof>;
      serializedName: "WinPoStProof";
    };
    parents: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Parents";
    };
    parentWeight: {
      type: bigint;
      serializedType: string;
      serializedName: "ParentWeight";
    };
    height: {
      type: number;
      serializedType: number;
      serializedName: "Height";
    };
    parentStateRoot: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ParentStateRoot";
    };
    parentMessageReceipts: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ParentMessageReceipts";
    };
    messages: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "Messages";
    };
    blsAggregate: {
      type: Signature;
      serializedType: SerializedSignature;
      serializedName: "BLSAggregate";
    };
    timestamp: {
      type: number;
      serializedType: number;
      serializedName: "Timestamp";
    };
    blockSignature: {
      type: Signature;
      serializedType: SerializedSignature;
      serializedName: "BlockSig";
    };
    forkSignaling: {
      type: 0 | 1;
      serializedType: 0 | 1;
      serializedName: "ForkSignaling";
    };
    parentBaseFee: {
      type: bigint;
      serializedType: string;
      serializedName: "ParentBaseFee";
    };
  };
}
declare class BlockHeader
  extends SerializableObject<BlockHeaderConfig>
  implements DeserializedObject<BlockHeaderConfig> {
  get config(): Definitions<BlockHeaderConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<BlockHeaderConfig>>
      | Partial<DeserializedObject<BlockHeaderConfig>>
  );
  miner: string;
  ticket: Ticket;
  electionProof: ElectionProof;
  beaconEntries: Array<BeaconEntry>;
  winPoStProof: Array<PoStProof>;
  parents: Array<RootCID>;
  parentWeight: bigint;
  height: number;
  parentStateRoot: RootCID;
  parentMessageReceipts: RootCID;
  messages: RootCID;
  blsAggregate: Signature;
  /**
   * Timestamp in seconds. Reference implementation: https://git.io/Jt3HJ.
   */
  timestamp: number;
  blockSignature: Signature;
  forkSignaling: 0 | 1;
  parentBaseFee: bigint;
  get cid(): CID;
}
declare type SerializedBlockHeader = SerializedObject<BlockHeaderConfig>;
export { BlockHeader, BlockHeaderConfig, SerializedBlockHeader };
