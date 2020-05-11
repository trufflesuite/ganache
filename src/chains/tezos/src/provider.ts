import {Provider} from "@ganache/utils/src/interfaces/provider";
import TezosApi from "./api";
import {RequestType} from "@ganache/utils/src/types";
import Emittery from "emittery";
import ProviderOptions from "@ganache/options/src/provider-options";

export default class TezosProvider extends Emittery.Typed<{request: RequestType<TezosApi>}, "ready" | "close">
  implements Provider<TezosApi> {
  constructor(providerOptions?: ProviderOptions) {
    super();
    this.emit("ready");
  }
  public async close () {
    this.emit("close");
  };
}
