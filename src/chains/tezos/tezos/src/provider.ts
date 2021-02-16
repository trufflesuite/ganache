import { Provider } from "@ganache/utils";
import TezosApi from "./api";
import Emittery from "emittery";

export default class TezosProvider
  extends Emittery.Typed<undefined, "ready" | "close">
  implements Provider<TezosApi> {
  constructor(providerOptions?: any) {
    super();
    this.emit("ready");
  }
  public getOptions() {
    throw new Error("Method not supported (getOptions)");
  }
  public getInitialAccounts() {
    throw new Error("Method not supported (getOptions)");
  }
  public async close() {
    this.emit("close");
  }
}
