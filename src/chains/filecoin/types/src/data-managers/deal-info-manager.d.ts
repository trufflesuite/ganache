/// <reference types="node" />
import Manager from "./manager";
import { LevelUp } from "levelup";
import { DealInfo, DealInfoConfig } from "../things/deal-info";
import { RootCID, SerializedRootCID } from "../things/root-cid";
/**
 * TODO: (Issue ganache-core#868) This loads all Deal CIDs and
 * then all the deals themselves into memory. The downstream
 * consumers of this manager then filters them at every time
 * it's used (i.e. filters them by DealInfo.State).
 *
 * We'll need to rework this in the future. LevelDB has a
 * `createReadStream` method that could help with some of this;
 * but David M. thinks we'll also need to add another sublevel
 * that acts as an index for deal states.
 */
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
