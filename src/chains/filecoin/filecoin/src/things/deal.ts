import { RootCID, SerializedRootCID } from "./root-cid";
import { DealState, nextSuccessfulState } from "../deal-state";
import { Miner, SerializedMiner } from "./miner";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

type DealConfig = {
  properties: {
    proposalCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ProposalCid";
    };
    state: {
      type: DealState;
      serializedType: DealState; // Remember: Enums are numbers at runtime!,
      serializedName: "State";
    };
    message: {
      type: string;
      serializedType: string;
      serializedName: "Message";
    };
    provider: {
      type: Miner;
      serializedType: SerializedMiner;
      serializedName: "Provider";
    };
    pieceCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "PieceCID";
    };
    size: {
      type: number;
      serializedType: number;
      serializedName: "Size";
    };
    pricePerEpoch: {
      type: string;
      serializedType: string;
      serializedName: "PricePerEpoch";
    };
    duration: {
      type: number;
      serializedType: number;
      serializedName: "Duration";
    };
    dealId: {
      type: number;
      serializedType: number;
      serializedName: "DealID";
    };
  };
};

class Deal
  extends SerializableObject<DealConfig>
  implements DeserializedObject<DealConfig> {
  get config(): Definitions<DealConfig> {
    return {
      proposalCid: {
        serializedName: "ProposalCid",
        defaultValue: options => new RootCID(options)
      },
      state: {
        serializedName: "State"
      },
      message: {
        serializedName: "Message"
      },
      provider: {
        serializedName: "Provider",
        defaultValue: options => new Miner(options)
      },
      pieceCid: {
        serializedName: "PieceCID"
      },
      size: {
        serializedName: "Size"
      },
      pricePerEpoch: {
        serializedName: "PricePerEpoch"
      },
      duration: {
        serializedName: "Duration"
      },
      dealId: {
        serializedName: "DealID"
      }
    };
  }

  proposalCid: RootCID;
  state: DealState;
  message: string;
  provider: Miner;
  pieceCid: RootCID;
  size: number;
  pricePerEpoch: string;
  duration: number;
  dealId: number;

  advanceState(fullyAdvance: boolean = false) {
    this.state = nextSuccessfulState[this.state];
  }
}

type SerializedDeal = SerializedObject<DealConfig>;

export { Deal, SerializedDeal };
