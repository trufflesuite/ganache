import ILedger from "./interfaces/ledger";

const _ledger = Symbol("ledger");

export default class Engine {
  private [_ledger]: ILedger;
  constructor(ledger: ILedger) {
    if (!ledger) {
      throw new Error("yah, that's not right");
    }
    this[_ledger] = ledger;
  }
  public async execute(method: string, params: any[]): Promise<any> {
    if (typeof method === "string") {
      const ledger = this[_ledger];
      if (ledger.__proto__.hasOwnProperty(method)) {
        const fn = ledger[method];
        if (typeof fn === "function") {
          return fn.apply(ledger, params);
        }
      }
    }
    throw new Error(`Invalid method: ${method}`);
  }
}