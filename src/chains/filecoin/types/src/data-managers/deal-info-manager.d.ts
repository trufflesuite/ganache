/// <reference types="node" />
import Manager from "./manager";
import { LevelUp } from "levelup";
import { DealInfo, DealInfoConfig } from "../things/deal-info";
import { SerializedRootCID } from "../things/root-cid";
export default class DealInfoManager extends Manager<DealInfo, DealInfoConfig> {
  static Deals: Buffer;
  static initialize(base: LevelUp): Promise<DealInfoManager>;
  constructor(base: LevelUp);
  updateDealInfo(deal: DealInfo): Promise<void>;
  addDealInfo(deal: DealInfo): Promise<void>;
  getDealCids(): Promise<Array<SerializedRootCID>>;
  getDeals(): Promise<Array<DealInfo>>;
  getDealById(dealId: number): Promise<DealInfo | null>;
  private putDealCids;
}
