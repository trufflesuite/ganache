import Manager from "./manager";
import { LevelUp } from "levelup";
import { DealInfo, DealInfoConfig } from "../things/deal-info";
import { RootCID, SerializedRootCID } from "../things/root-cid";

const NOTFOUND = 404;

/**
 * TODO: (Issue ganache#868) This loads all Deal CIDs and
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
  static Deals = Buffer.from("deals");

  #dealExpirations: LevelUp;

  static async initialize(base: LevelUp, dealExpirations: LevelUp) {
    const manager = new DealInfoManager(base, dealExpirations);
    return manager;
  }

  constructor(base: LevelUp, dealExpirations: LevelUp) {
    super(base, DealInfo);
    this.#dealExpirations = dealExpirations;
  }

  async updateDealInfo(deal: DealInfo) {
    await super.set(deal.proposalCid.root.value, deal);
  }

  async addDealInfo(deal: DealInfo, expirationTipsetHeight: number) {
    await this.updateDealInfo(deal);
    const cids = await this.getDealCids();
    cids.push(deal.proposalCid.serialize());
    await this.putDealCids(cids);

    this.#dealExpirations.put(
      Buffer.from(deal.proposalCid.root.value),
      Buffer.from(`${expirationTipsetHeight}`)
    );
  }

  async getDealCids(): Promise<Array<SerializedRootCID>> {
    try {
      const result: Buffer = await this.base.get(DealInfoManager.Deals);
      return JSON.parse(result.toString());
    } catch (e: any) {
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

  async getDealExpiration(proposalId: RootCID): Promise<number | null> {
    try {
      const result = await this.#dealExpirations.get(
        Buffer.from(proposalId.root.value)
      );
      return parseInt(result.toString(), 10);
    } catch (e: any) {
      if (e.status === NOTFOUND) {
        return null;
      }
      throw e;
    }
  }

  private async putDealCids(cids: Array<SerializedRootCID>): Promise<void> {
    await this.base.put(DealInfoManager.Deals, JSON.stringify(cids));
  }
}
