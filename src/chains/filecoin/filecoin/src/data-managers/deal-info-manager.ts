import Manager from "./manager";
import { LevelUp } from "levelup";
import { DealInfo, DealInfoConfig } from "../things/deal-info";
import { SerializedRootCID } from "../things/root-cid";

const NOTFOUND = 404;

export default class DealInfoManager extends Manager<DealInfo, DealInfoConfig> {
  static Deals = Buffer.from("deals");

  static async initialize(base: LevelUp) {
    const manager = new DealInfoManager(base);
    return manager;
  }

  constructor(base: LevelUp) {
    super(base, DealInfo);
  }

  async updateDealInfo(deal: DealInfo) {
    await super.set(deal.proposalCid.root.value, deal);
  }

  async addDealInfo(deal: DealInfo) {
    await this.updateDealInfo(deal);
    const cids = await this.getDealCids();
    cids.push(deal.proposalCid.serialize());
    await this.putDealCids(cids);
  }

  async getDealCids(): Promise<Array<SerializedRootCID>> {
    try {
      const result: Buffer = await this.base.get(DealInfoManager.Deals);
      return JSON.parse(result.toString());
    } catch (e) {
      if (e.status === NOTFOUND) {
        await this.base.put(
          DealInfoManager.Deals,
          Buffer.from(JSON.stringify([]))
        );
        return [];
      }
      throw e;
    }
  }

  async getDeals(): Promise<Array<DealInfo>> {
    const cids = await this.getDealCids();
    const deals = await Promise.all(
      cids.map(async cid => await super.get(cid["/"]))
    );

    const cidsToKeep: SerializedRootCID[] = [];
    const validDeals: DealInfo[] = [];
    for (let i = 0; i < deals.length; i++) {
      if (deals[i] !== null) {
        cidsToKeep.push(cids[i]);
        validDeals.push(deals[i] as DealInfo);
      }
    }
    if (cids.length !== cidsToKeep.length) {
      await this.putDealCids(cidsToKeep);
    }

    return validDeals;
  }

  async getDealById(dealId: number): Promise<DealInfo | null> {
    const cids = await this.getDealCids();
    const dealCid = cids[dealId - 1];
    if (dealCid) {
      return await this.get(dealCid["/"]);
    } else {
      return null;
    }
  }

  private async putDealCids(cids: Array<SerializedRootCID>): Promise<void> {
    await this.base.put(DealInfoManager.Deals, JSON.stringify(cids));
  }
}
