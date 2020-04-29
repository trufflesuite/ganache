import {Provider} from "../../interfaces/provider";
import TezosApi from "./api";
import {RequestType} from "../../types";
import Emittery from "emittery";

export default class TezosProvider extends Emittery.Typed<{request: RequestType<TezosApi>}, "ready" | "close">
  implements Provider<TezosApi> {
  close = async () => {};
}
