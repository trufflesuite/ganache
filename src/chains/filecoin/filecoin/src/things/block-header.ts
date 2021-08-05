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
import { SerializedSignature, Signature } from "./signature";
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#BlockHeader

interface BlockHeaderConfig {
  properties: {
    miner: {
      type: Address;
      serializedType: SerializedAddress;
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
        deserializedName: "miner",
        serializedName: "Miner",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      ticket: {
        deserializedName: "ticket",
        serializedName: "Ticket",
        defaultValue: options => new Ticket(options)
      },
      electionProof: {
        deserializedName: "electionProof",
        serializedName: "ElectionProof",
        defaultValue: options => new ElectionProof(options)
      },
      beaconEntries: {
        deserializedName: "beaconEntries",
        serializedName: "BeaconEntries",
        defaultValue: options =>
          options ? options.map(entry => new BeaconEntry(entry)) : []
      },
      winPoStProof: {
        deserializedName: "winPoStProof",
        serializedName: "WinPoStProof",
        defaultValue: options =>
          options ? options.map(proof => new PoStProof(proof)) : []
      },
      parents: {
        deserializedName: "parents",
        serializedName: "Parents",
        defaultValue: options =>
          options ? options.map(parent => new RootCID(parent)) : []
      },
      parentWeight: {
        deserializedName: "parentWeight",
        serializedName: "ParentWeight",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      height: {
        deserializedName: "height",
        serializedName: "Height",
        defaultValue: 0
      },
      parentStateRoot: {
        deserializedName: "parentStateRoot",
        serializedName: "ParentStateRoot",
        defaultValue: options => new RootCID(options)
      },
      parentMessageReceipts: {
        deserializedName: "parentMessageReceipts",
        serializedName: "ParentMessageReceipts",
        defaultValue: options => new RootCID(options)
      },
      messages: {
        deserializedName: "messages",
        serializedName: "Messages",
        defaultValue: options => new RootCID(options)
      },
      blsAggregate: {
        deserializedName: "blsAggregate",
        serializedName: "BLSAggregate",
        defaultValue: options => new Signature(options)
      },
      timestamp: {
        deserializedName: "timestamp",
        serializedName: "Timestamp",
        defaultValue: literal => {
          return typeof literal !== "undefined"
            ? literal
            : new Date().getTime() / 1000;
        }
      },
      blockSignature: {
        deserializedName: "blockSignature",
        serializedName: "BlockSig",
        defaultValue: options => new Signature(options)
      },
      forkSignaling: {
        deserializedName: "forkSignaling",
        serializedName: "ForkSignaling",
        defaultValue: 0
      },
      parentBaseFee: {
        deserializedName: "parentBaseFee",
        serializedName: "ParentBaseFee",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<BlockHeaderConfig>>
      | Partial<DeserializedObject<BlockHeaderConfig>>
  ) {
    super();

    this.miner = super.initializeValue(this.config.miner, options);
    this.ticket = super.initializeValue(this.config.ticket, options);
    this.electionProof = super.initializeValue(
      this.config.electionProof,
      options
    );
    this.beaconEntries = super.initializeValue(
      this.config.beaconEntries,
      options
    );
    this.winPoStProof = super.initializeValue(
      this.config.winPoStProof,
      options
    );
    this.parents = super.initializeValue(this.config.parents, options);
    this.parentWeight = super.initializeValue(
      this.config.parentWeight,
      options
    );
    this.height = super.initializeValue(this.config.height, options);
    this.parentStateRoot = super.initializeValue(
      this.config.parentStateRoot,
      options
    );
    this.parentMessageReceipts = super.initializeValue(
      this.config.parentMessageReceipts,
      options
    );
    this.messages = super.initializeValue(this.config.messages, options);
    this.blsAggregate = super.initializeValue(
      this.config.blsAggregate,
      options
    );
    this.timestamp = super.initializeValue(this.config.timestamp, options);
    this.blockSignature = super.initializeValue(
      this.config.blockSignature,
      options
    );
    this.forkSignaling = super.initializeValue(
      this.config.forkSignaling,
      options
    );
    this.parentBaseFee = super.initializeValue(
      this.config.parentBaseFee,
      options
    );
  }

  miner: Address;
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
}

type SerializedBlockHeader = SerializedObject<BlockHeaderConfig>;

export { BlockHeader, BlockHeaderConfig, SerializedBlockHeader };
