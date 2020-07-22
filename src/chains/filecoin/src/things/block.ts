import { Ticket, TicketParameters, SerializedTicketParameters } from "./ticket";
import { ElectionProof, ElectionProofParameters, SerializedElectionProofParameters } from "./electionproof";
import { BeaconEntry, SerializedBeaconEntryParameters } from "./beaconentry";
import { BLSAggregate, SerializedBLSAggregateParameters } from "./blsaggregate";
import { BlockSignature, SerializedBlockSignatureParameters } from "./blocksignature";
import { SerializableObject } from "./serializableobject";
import { WinPoStProof, SerializedWinPoStProofParameters } from "./winpostproof";
import CID from "./cid";

interface BlockParameters {
  miner: string;
  ticket: Ticket;
  electionProof: ElectionProof;
  beaconEntries: Array<BeaconEntry>;
  winPoStProof: Array<WinPoStProof>;
  parents: Array<Record<string, CID>>;
  parentWeight: string;
  height: number;
  parentStateRoot: Record<string, CID>;
  parentMessageReceipts: Record<string, CID>;
  messages: Record<string, CID>;
  blsAggregate: BLSAggregate;
  timestamp: number;
  blockSignature: BlockSignature;
  forkSignaling: 0 | 1;
}

interface SerializedBlockParameters {
  Miner: string;
  Ticket: SerializedTicketParameters;
  ElectionProof: SerializedElectionProofParameters;
  BeaconEntries: Array<SerializedBeaconEntryParameters>;
  WinPoStProof: Array<SerializedWinPoStProofParameters>;
  Parents: Array<Record<string, CID>>;
  ParentWeight: string;
  Height: number;
  ParentStateRoot: Record<string, CID>;
  ParentMessageReceipts: Record<string, CID>;
  Messages: Record<string, CID>;
  BLSAggregate: SerializedBLSAggregateParameters,
  Timestamp: number;
  BlockSig: SerializedBlockSignatureParameters;
  ForkSignaling: 0 | 1;
}

class Block extends SerializableObject<BlockParameters, SerializedBlockParameters> {
  
  defaults(options:SerializedBlockParameters):BlockParameters {
    return {
      miner: "t01000",
      ticket: new Ticket(options.Ticket),
      electionProof: new ElectionProof(options.ElectionProof),
      beaconEntries: [
        ...options.BeaconEntries.map((entry) => new BeaconEntry(entry))
      ],
      winPoStProof: [
        ...options.WinPoStProof.map((proof) => new WinPoStProof(proof))
      ],
      parents: options.Parents,
      parentWeight: "0",
      height: 0,
      parentStateRoot: {},
      parentMessageReceipts: {},
      messages: {},
      blsAggregate: new BLSAggregate(options.BLSAggregate),
      timestamp: new Date().getTime(),
      blockSignature: new BlockSignature(options.BlockSig),
      forkSignaling: 0
    }
  }

  keyMapping():Record<keyof BlockParameters, keyof SerializedBlockParameters> {
    return {
      miner: "Miner",
      ticket: "Ticket",
      electionProof: "ElectionProof",
      beaconEntries: "BeaconEntries",
      winPoStProof: "WinPoStProof",
      parents: "Parents",
      parentWeight: "ParentWeight",
      height: "Height",
      parentStateRoot: "ParentStateRoot",
      parentMessageReceipts: "ParentMessageReceipts",
      messages: "Messages",
      blsAggregate: "BLSAggregate",
      timestamp: "Timestamp",
      blockSignature: "BlockSig",
      forkSignaling: "ForkSignaling"
    }
  }
}

export {
  Block,
  BlockParameters,
  SerializedBlockParameters
};