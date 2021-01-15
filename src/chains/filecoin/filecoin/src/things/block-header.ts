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
import cbor from "borc";
import { CID as IPFS_CID } from "ipfs";
import multihashing from "multihashing";
import multicodec from "multicodec";
import { SerializedSignature, Signature } from "./signature";

// https://pkg.go.dev/github.com/filecoin-project/lotus/chain/types#BlockHeader

interface BlockHeaderConfig {
  properties: {
    miner: {
      type: string; // string until we can support more address types in Address
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

class BlockHeader
  extends SerializableObject<BlockHeaderConfig>
  implements DeserializedObject<BlockHeaderConfig> {
  get config(): Definitions<BlockHeaderConfig> {
    return {
      miner: {
        serializedName: "Miner",
        defaultValue: "t01000"
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
          options ? options.map(proof => new PoStProof(proof)) : []
      },
      parents: {
        serializedName: "Parents",
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
      },
      parentWeight: {
        serializedName: "ParentWeight",
        defaultValue: 0n
      },
      height: {
        serializedName: "Height",
        defaultValue: 0
      },
      parentStateRoot: {
        serializedName: "ParentStateRoot",
        defaultValue: options => new RootCID(options || { "/": "" })
      },
      parentMessageReceipts: {
        serializedName: "ParentMessageReceipts",
        defaultValue: options => new RootCID(options || { "/": "" })
      },
      messages: {
        serializedName: "Messages",
        defaultValue: options => new RootCID(options || { "/": "" })
      },
      blsAggregate: {
        serializedName: "BLSAggregate",
        defaultValue: options =>
          new Signature(
            options || {
              type: 2,
              data:
                "wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
            }
          )
      },
      timestamp: {
        serializedName: "Timestamp",
        defaultValue: () => {
          return new Date().getTime();
        }
      },
      blockSignature: {
        serializedName: "BlockSig",
        defaultValue: options => new Signature(options)
      },
      forkSignaling: {
        serializedName: "ForkSignaling",
        defaultValue: 0
      },
      parentBaseFee: {
        serializedName: "ParentBaseFee",
        defaultValue: 0n
      }
    };
  }

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
  timestamp: number;
  blockSignature: Signature;
  forkSignaling: 0 | 1;
  parentBaseFee: bigint;

  get cid(): CID {
    let blockHeader: Partial<DeserializedObject<BlockHeaderConfig>> = {};

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

type SerializedBlockHeader = SerializedObject<BlockHeaderConfig>;

export { BlockHeader, SerializedBlockHeader };
