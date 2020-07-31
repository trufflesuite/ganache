import {types} from "@ganache/utils";
import TezosApi from "./api";
import Emittery from "emittery";
import { TezosOptions } from "@ganache/options";

export default class TezosProvider extends Emittery.Typed<{request: types.RequestType<TezosApi>}, "ready" | "close">
  implements types.Provider<TezosApi> {
  constructor(providerOptions?: TezosOptions) {
    super();
    this.emit("ready");
  }
  public async close () {
    this.emit("close");
  };
}
