import Api from "../../core/src/interfaces/api";

export default class TezosApi implements Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  async version(): Promise<string> {
    return "just an example";
  }
}
