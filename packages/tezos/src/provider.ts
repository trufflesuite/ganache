import {Provider} from "@ganache/core/src/interfaces/provider";
import TezosApi from "./api";
import {RequestType} from "@ganache/core/src/types";
import Emittery from "emittery";
import ProviderOptions from "@ganache/core/src/options/provider-options";

export default class TezosProvider extends Emittery.Typed<{request: RequestType<TezosApi>}, "ready" | "close">
  implements Provider<TezosApi> {
  constructor(providerOptions?: ProviderOptions) {
    super();
  }
  public async close () {};
}
