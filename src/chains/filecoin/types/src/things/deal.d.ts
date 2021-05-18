import { RootCID, SerializedRootCID } from "./root-cid";
import { DealState } from "../deal-state";
import { Miner, SerializedMiner } from "./miner";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
declare type DealConfig = {
  properties: {
    proposalCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ProposalCid";
    };
    state: {
      type: DealState;
      serializedType: DealState;
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
declare class Deal
  extends SerializableObject<DealConfig>
  implements DeserializedObject<DealConfig> {
  get config(): Definitions<DealConfig>;
  proposalCid: RootCID;
  state: DealState;
  message: string;
  provider: Miner;
  pieceCid: RootCID;
  size: number;
  pricePerEpoch: string;
  duration: number;
  dealId: number;
  advanceState(): void;
}
declare type SerializedDeal = SerializedObject<DealConfig>;
export { Deal, SerializedDeal };
