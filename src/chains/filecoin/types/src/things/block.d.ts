import { Ticket, SerializedTicket } from "./ticket";
import { ElectionProof, SerializedElectionProof } from "./election-proof";
import { BeaconEntry, SerializedBeaconEntry } from "./beacon-entry";
import { BLSAggregate, SerializedBLSAggregate } from "./bls-aggregate";
import { BlockSignature, SerializedBlockSignature } from "./block-signature";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { WinPoStProof, SerializedWinPoStProof } from "./win-post-proof";
import { RootCID, SerializedRootCID } from "./root-cid";
import { Miner } from "./miner";
import { CID } from "./cid";
interface BlockConfig {
  properties: {
    miner: {
      type: Miner;
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
      type: Array<WinPoStProof>;
      serializedType: Array<SerializedWinPoStProof>;
      serializedName: "WinPoStProof";
    };
    parents: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Parents";
    };
    parentWeight: {
      type: number;
      serializedType: number;
      serializedName: "ParentWeight";
    };
    height: {
      type: number;
      serializedType: number;
      serializedName: "Height";
    };
    parentStateRoot: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "ParentStateRoot";
    };
    parentMessageReceipts: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "ParentMessageReceipts";
    };
    messages: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Messages";
    };
    blsAggregate: {
      type: BLSAggregate;
      serializedType: SerializedBLSAggregate;
      serializedName: "BLSAggregate";
    };
    timestamp: {
      type: number;
      serializedType: number;
      serializedName: "Timestamp";
    };
    blockSignature: {
      type: BlockSignature;
      serializedType: SerializedBlockSignature;
      serializedName: "BlockSig";
    };
    forkSignaling: {
      type: 0 | 1;
      serializedType: 0 | 1;
      serializedName: "ForkSignaling";
    };
  };
}
declare class Block
  extends SerializableObject<BlockConfig>
  implements DeserializedObject<BlockConfig> {
  get config(): Definitions<BlockConfig>;
  miner: Miner;
  ticket: Ticket;
  electionProof: ElectionProof;
  beaconEntries: Array<BeaconEntry>;
  winPoStProof: Array<WinPoStProof>;
  parents: Array<RootCID>;
  parentWeight: number;
  height: number;
  parentStateRoot: Array<RootCID>;
  parentMessageReceipts: Array<RootCID>;
  messages: Array<RootCID>;
  blsAggregate: BLSAggregate;
  timestamp: number;
  blockSignature: BlockSignature;
  forkSignaling: 0 | 1;
  get cid(): CID;
}
declare type SerializedBlock = SerializedObject<BlockConfig>;
export { Block, SerializedBlock };
