import ILedger from "./interfaces/ledger";
import Emittery from "emittery";

const _ledger = Symbol("ledger");

export default class Engine extends Emittery {
  private [_ledger]: ILedger;
  constructor(ledger: ILedger) {
    super();

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