import assert from "assert";
import { SubscriptionMethod } from "../../../src/types/subscriptions";
import getServer from "../../helpers/getServer";
import WebSocket from "ws";
import Server from "../../../../../../packages/core/src/server";

describe("api", () => {
  describe("filecoin", () => {
    let server: Server<"filecoin">;
    let ws: WebSocket;
    const port = 7778; // Use a different port than the default, to test it works

    before(async () => {
      server = await getServer(port);
      ws = new WebSocket(`ws://localhost:${port}/rpc/v0`);

      await new Promise<void>((resolve, reject) => {
        const id = setTimeout(async () => {
          await server.close();
          ws.terminate();
          reject("Could not connect to the websocket server");
        }, 2000);

        ws.on("open", () => {
          clearTimeout(id);
          resolve();
        });
      });
    });

    after(async () => {
      if (ws) {
        ws.close();
      }
      if (server) {
        await server.close();
      }
    });

    it("should subscribe and unsubscribe properly with websockets", async () => {
      let numTipsetsReceived = 0;
      const chainNotifyId = "1337"; // using something non-zero to ensure functionality
      let receivedMessage = false;
      let receivedSubscriptionCanceled = false;
      let channelId: any;

      ws.on("message", message => {
        const response = JSON.parse(message.toString());

        if (response.result) {
          switch (response.id) {
            case chainNotifyId:
              channelId = response.result;
              receivedMessage = true;
              break;
            case "0":
              receivedMessage = true;
              assert.strictEqual(response.result.Height, 1);
              break;
            case "1":
              receivedMessage = true;
              assert.strictEqual(response.result.Height, 2);
              break;
            case "2":
              receivedMessage = true;
              assert.strictEqual(response.result.Height, 3);
              break;
            case "3":
              receivedMessage = true;
              assert.strictEqual(response.result.Height, 4);
              break;
            case "4":
              receivedMessage = true;
              assert.strictEqual(response.result.Height, 5);
              break;
            case "5":
              receivedMessage = true;
              assert.strictEqual(response.result, true);
              break;
          }
        } else if (response.method) {
          if (response.method === SubscriptionMethod.SubscriptionCanceled) {
            assert.strictEqual(response.params[0], chainNotifyId);
            receivedSubscriptionCanceled = true;
          } else if (response.method === SubscriptionMethod.ChannelUpdated) {
            assert.strictEqual(response.params[0], channelId);
            assert.strictEqual(response.params[1].length, 1); // should only have one tipset per headchange
            assert.strictEqual(
              response.params[1][0].Val.Height,
              ++numTipsetsReceived
            );
          }
        }
      });

      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: chainNotifyId,
          method: "Filecoin.ChainNotify",
          params: []
        })
      );

      for (let i = 0; i < 100; i++) {
        if (receivedMessage) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!receivedMessage) {
        assert.fail("Did not receive response for ChainNotify");
      }

      for (let i = 0; i < 5; i++) {
        receivedMessage = false;
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: `${i}`,
            method: "Ganache.MineTipset",
            params: []
          })
        );

        for (let j = 0; j < 100; j++) {
          if (receivedMessage) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (!receivedMessage) {
          assert.fail(`Did not receive response for Ganache.MineTipset #${i}`);
        }
      }

      receivedMessage = false;
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "5",
          method: SubscriptionMethod.ChannelClosed,
          params: [channelId]
        })
      );

      for (let i = 0; i < 100; i++) {
        if (receivedSubscriptionCanceled) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!receivedSubscriptionCanceled) {
        assert.fail(
          `Did not receive ${SubscriptionMethod.SubscriptionCanceled} after closing channel/subscription`
        );
      }
    });
  }).timeout(10000);
});
