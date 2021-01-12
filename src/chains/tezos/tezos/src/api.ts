import { types } from "@ganache/utils";

export default class TezosApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  async version(): Promise<string> {
    return "just an example";
  }
}
