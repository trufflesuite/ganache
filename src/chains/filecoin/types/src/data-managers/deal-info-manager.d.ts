/// <reference types="node" />
import Manager from "./manager";
import { LevelUp } from "levelup";
import { DealInfo, DealInfoConfig } from "../things/deal-info";
import { RootCID, SerializedRootCID } from "../things/root-cid";
export default class DealInfoManager extends Manager<DealInfo, DealInfoConfig> {
  #private;
  static Deals: Buffer;
  static initialize(
    base: LevelUp,
    dealExpirations: LevelUp
  ): Promise<DealInfoManager>;
  constructor(base: LevelUp, dealExpirations: LevelUp);
  updateDealInfo(deal: DealInfo): Promise<void>;
  addDealInfo(deal: DealInfo, expirationTipsetHeight: number): Promise<void>;
  getDealCids(): Promise<Array<SerializedRootCID>>;
  getDeals(): Promise<Array<DealInfo>>;
  getDealById(dealId: number): Promise<DealInfo | null>;
  getDealExpiration(proposalId: RootCID): Promise<number | null>;
  private putDealCids;
}
