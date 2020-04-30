import {Provider} from "../../interfaces/provider";
import TezosApi from "./api";
import {RequestType} from "../../types";
import Emittery from "emittery";
import ProviderOptions from "../../options/provider-options";

export default class TezosProvider extends Emittery.Typed<{request: RequestType<TezosApi>}, "ready" | "close">
  implements Provider<TezosApi> {
  constructor(providerOptions?: ProviderOptions) {
    super();
  }
  public async close () {};
}
