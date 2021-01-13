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
import cbor from "borc";
import { CID as IPFS_CID } from "ipfs";
import multihashing from "multihashing";
import multicodec from "multicodec";

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

class Block
  extends SerializableObject<BlockConfig>
  implements DeserializedObject<BlockConfig> {
  get config(): Definitions<BlockConfig> {
    return {
      miner: {
        serializedName: "Miner",
        defaultValue: options => new Miner(options)
      },
      ticket: {
        serializedName: "Ticket",
        defaultValue: options => new Ticket(options)
      },
      electionProof: {
        serializedName: "ElectionProof",
        defaultValue: options => new ElectionProof(options)
      },
      beaconEntries: {
        serializedName: "BeaconEntries",
        defaultValue: options =>
          options ? options.map(entry => new BeaconEntry(entry)) : []
      },
      winPoStProof: {
        serializedName: "WinPoStProof",
        defaultValue: options =>
          options ? options.map(proof => new WinPoStProof(proof)) : []
      },
      parents: {
        serializedName: "Parents",
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
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
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
      },
      parentMessageReceipts: {
        serializedName: "ParentMessageReceipts",
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
      },
      messages: {
        serializedName: "Messages",
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
      },
      blsAggregate: {
        serializedName: "BLSAggregate",
        defaultValue: options => new BLSAggregate(options)
      },
      timestamp: {
        serializedName: "Timestamp",
        defaultValue: () => {
          return new Date().getTime();
        }
      },
      blockSignature: {
        serializedName: "BlockSig",
        defaultValue: options => new BlockSignature(options)
      },
      forkSignaling: {
        serializedName: "ForkSignaling",
        defaultValue: 0
      }
    };
  }

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

  get cid(): CID {
    let blockHeader: Partial<DeserializedObject<BlockConfig>> = {};

    for (const [deserializedName, { serializedName }] of Object.entries(
      this.config
    )) {
      blockHeader[serializedName] = this[deserializedName];
    }

    // We could have used the ipld-dag-cbor package for the following,
    // but it was async, which caused a number of issues during object construction.
    let cborBlockHeader = cbor.encode(blockHeader);
    let multihash = multihashing(cborBlockHeader, "blake2b-256");
    let rawCid = new IPFS_CID(
      1,
      multicodec.print[multicodec.DAG_CBOR],
      multihash
    );

    return new CID(rawCid.toString());
  }
}

type SerializedBlock = SerializedObject<BlockConfig>;

export { Block, SerializedBlock };
