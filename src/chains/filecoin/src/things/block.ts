import { Ticket, SerializedTicket } from "./ticket";
import { ElectionProof, SerializedElectionProof } from "./electionproof";
import { BeaconEntry, SerializedBeaconEntry } from "./beaconentry";
import { BLSAggregate, SerializedBLSAggregate } from "./blsaggregate";
import { BlockSignature, SerializedBlockSignature } from "./blocksignature";
import { SerializableObject, DeserializedObject, Definitions, SerializedObject } from "./serializableobject";
import { WinPoStProof, SerializedWinPoStProof } from "./winpostproof";
import CID from "./cid";
import { RootCID, SerializedRootCID } from "./rootcid";


interface BlockConfig {
  properties: {
    miner: {
      type: string;
      serializedType: string;
      serializedName: "Miner";
    },
    ticket: {
      type: Ticket;
      serializedType: SerializedTicket;
      serializedName: "Ticket";
    }
    electionProof: {
      type: ElectionProof;
      serializedType: SerializedElectionProof;
      serializedName: "ElectionProof";
    }
    beaconEntries: {
      type: Array<BeaconEntry>,
      serializedType: Array<SerializedBeaconEntry>,
      serializedName: "BeaconEntries";
    }
    winPoStProof: {
      type: Array<WinPoStProof>,
      serializedType: Array<SerializedWinPoStProof>,
      serializedName: "WinPoStProof";
    }
    parents: {
      type: Array<RootCID>,
      serializedType: Array<SerializedRootCID>,
      serializedName: "Parents";
    },
    parentWeight: {
      type: number;
      serializedType: number;
      serializedName: "ParentWeight";
    },
    height: {
      type: number;
      serializedType: number;
      serializedName: "Height";
    }
    parentStateRoot: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "ParentStateRoot";
    },
    parentMessageReceipts: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "ParentMessageReceipts";
    },
    messages: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Messages";
    },
    blsAggregate: {
      type: BLSAggregate;
      serializedType: SerializedBLSAggregate;
      serializedName: "BLSAggregate";
    }
    timestamp: {
      type: number;
      serializedType: number;
      serializedName: "Timestamp";
    },
    blockSignature: {
      type: BlockSignature;
      serializedType: SerializedBlockSignature;
      serializedName: "BlockSig";
    }
    forkSignaling: {
      type: 0 | 1;
      serializedType: 0 | 1;
      serializedName: "ForkSignaling";
    }
  }
}

class Block extends SerializableObject<BlockConfig> implements DeserializedObject<BlockConfig>  {
  get config():Definitions<BlockConfig> {
    return {
      miner: {
        serializedName: "Miner",
        defaultValue: "t01000"
      },
      ticket: {
        serializedName: "Ticket",
        defaultValue: (options) => new Ticket(options)
      },
      electionProof: {
        serializedName: "ElectionProof",
        defaultValue: (options) => new ElectionProof(options)
      },
      beaconEntries: {
        serializedName: "BeaconEntries",
        defaultValue: (options) => options.map((entry) => new BeaconEntry(entry))
      },
      winPoStProof: {
        serializedName: "WinPoStProof",
        defaultValue: (options) => options.map((proof) => new WinPoStProof(proof))
      },
      parents: {
        serializedName: "Parents",
        defaultValue: (options) => options.map((parent) => new RootCID(parent))
      },
      parentWeight: {
        serializedName: "ParentWeight",
        defaultValue: 0
      },
      height: {
        serializedName: "Height",
        defaultValue: 0
      },
      parentStateRoot: {
        serializedName: "ParentStateRoot",
        defaultValue: (options) => options.map((parent) => new RootCID(parent))
      },
      parentMessageReceipts: {
        serializedName: "ParentMessageReceipts",
        defaultValue: (options) => options.map((parent) => new RootCID(parent))
      },
      messages: {
        serializedName: "Messages",
        defaultValue: (options) => options.map((parent) => new RootCID(parent))
      },
      blsAggregate: {
        serializedName: "BLSAggregate",
        defaultValue: (options) => new BLSAggregate(options)
      },
      timestamp: {
        serializedName: "Timestamp",
        defaultValue: () => {
          return new Date().getTime()
        }
      },
      blockSignature: {
        serializedName: "BlockSig",
        defaultValue: (options) => new BlockSignature(options)
      },
      forkSignaling: {
        serializedName: "ForkSignaling",
        defaultValue: 0
      }
    }
  };

  miner: string;
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
}

type SerializedBlock = SerializedObject<BlockConfig>;

export {
  Block,
  SerializedBlock
};