import {types} from "@ganache/utils";
import TezosApi from "./api";
import Emittery from "emittery";
import {ProviderOptions} from "@ganache/options";

export default class TezosProvider extends Emittery.Typed<{request: types.RequestType<TezosApi>}, "ready" | "close">
  implements types.Provider<TezosApi> {
  constructor(providerOptions?: ProviderOptions) {
    super();
    this.emit("ready");
  }
  public async close () {
    this.emit("close");
  };
}
