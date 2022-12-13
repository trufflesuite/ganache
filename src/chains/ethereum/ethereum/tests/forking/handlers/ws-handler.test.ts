import assert from "assert";
import AbortController from "abort-controller";
import { WsHandler } from "../../../src/forking/handlers/ws-handler";
import {
  EthereumOptionsConfig,
  EthereumProviderOptions
} from "@ganache/ethereum-options";
import WebSocket from "ws";

const createWebSocketServer = (port: number): WebSocket.Server => {
  let wsServer = new WebSocket.Server({ port });
  wsServer.on("connection", async ws => {
    ws.on("message", data => {
      const message = JSON.parse(data.toString());
      ws.send(
        Buffer.from(
          JSON.stringify({
            id: message.id,
            jsonrpc: "2.0",
            result: "0x0"
          }),
          "utf-8"
        )
      );
      if (message.method === "client-disconnect") {
        setTimeout(() => {
          ws.terminate();
        }, 10);
      }
    });
  });
  return wsServer;
};

// create test server
const URL = "ws://localhost:8888/";
let wsServer: WebSocket.Server;
let wsHandler: WsHandler;
wsServer = createWebSocketServer(8888);

describe("ws-handler", function () {
  describe("retries", function () {
    before(() => {
      const providerOptions = EthereumOptionsConfig.normalize({
        fork: {
          url: URL,
          origin: "test"
        }
      } as EthereumProviderOptions);
      const abortController: AbortController = new AbortController();
      wsHandler = new WsHandler(providerOptions, abortController.signal, {
        retryCounter: 4,
        retryIntervalBaseInSeconds: 3
      });
    });

    after(() => {
      wsHandler.close();
      wsServer.close();
    });

    it("should attempt to reconnect the server when connection is terminated", async () => {
      // send a request to websocket server to get connection termination.
      await wsHandler.request<any>("client-disconnect", [], {
        disableCache: true
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // send request after connection is terminated
      const retryPromise = wsHandler.request<any>("retry", [], {
        disableCache: true
      });

      // assert the result
      const response = await retryPromise;
      assert.equal(response, "0x0");
    }).timeout(10000);
  });
});
