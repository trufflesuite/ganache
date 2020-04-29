import {Provider} from "../../interfaces/provider";
import TezosApi from "./api";
import {KnownKeys} from "../../types";

export default class TezosProvider implements Provider<TezosApi> {
  request = async (method: KnownKeys<TezosApi>, params?: any[]) => {
    return {} as any;
  };
  close = async () => {};
}
