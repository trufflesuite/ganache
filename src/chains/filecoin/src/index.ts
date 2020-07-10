import Emittery from "emittery";
import {types, utils} from "@ganache/utils";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import FilecoinApi from "./api";

export default class FilecoinConnector extends Emittery.Typed<undefined, "ready" | "close"> 
  implements types.Connector<FilecoinApi, JsonRpc.Request<FilecoinApi>> {
  provider: types.Provider<FilecoinApi>;
  parse(message: Buffer): JsonRpc.Request<FilecoinApi> {
    throw new Error("Method not implemented.");
  }


  handle(payload: JsonRpc.Request<FilecoinApi>, connection: HttpRequest | WebSocket): PromiEvent<any> {
    const method = payload.method;
    if (method === "eth_subscribe") {
      if (isHttp(connection)) {
        const error = JsonRpc.Error(payload.id, "-32000", "notifications not supported");
        return new PromiEvent((_, reject) => void reject(error));
      } else {
        return this.#provider.request("eth_subscribe", payload.params as Parameters<EthereumApi["eth_subscribe"]>);
      }
    }
    return new PromiEvent((resolve) => {
      this.#provider.request(method, payload.params as Parameters<EthereumApi[typeof method]>).then(resolve);
    });
  }

  handle: ((payload: JsonRpc.Request<FilecoinApi>, connection: import("uWebSockets.js").HttpRequest) => Promise<any>) | ((payload: JsonRpc.Request<FilecoinApi>, connection: import("uWebSockets.js").WebSocket) => import("@ganache/utils/src/things/promievent").default<...>);
  format(result: any, payload: JsonRpc.Request<FilecoinApi>): import("uWebSockets.js").RecognizedString {
    throw new Error("Method not implemented.");
  }
  close(): void {
    throw new Error("Method not implemented.");
  }

}