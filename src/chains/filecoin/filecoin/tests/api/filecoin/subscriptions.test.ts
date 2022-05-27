import assert from "assert";
import Emittery from "emittery";
import { FilecoinProvider } from "../../../src/provider";
import { SubscriptionMethod } from "../../../src/types/subscriptions";
import getProvider from "../../helpers/getProvider";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
    });

    after(async () => {
      if (provider) {
        await provider.stop();
      }
    });

    describe("Filecoin.ChainNotify", () => {
      let unsubscribe: Emittery.UnsubscribeFn;
      let numTipsetsReceived = 0;

      it("should receive updates for new tipsets", async () => {
        const subscription = await client.chainNotify((_changes: any) => {
          numTipsetsReceived++;
        });

        unsubscribe = subscription[0];

        for (let i = 0; i < 5; i++) {
          await provider.send({
            jsonrpc: "2.0",
            id: "0",
            method: "Ganache.MineTipset"
          });
        }

        assert.strictEqual(numTipsetsReceived, 5);
      });

      it("should cancel subscription via unsubscribe function", async () => {
        unsubscribe();

        await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.MineTipset"
        });

        assert.strictEqual(numTipsetsReceived, 5);
      });

      it("should cancel subscription via RPC method", async () => {
        numTipsetsReceived = 0;

        const subscription = await client.chainNotify((_changes: any) => {
          numTipsetsReceived++;
        });

        const subscriptionId: string = await subscription[1];

        for (let i = 0; i < 5; i++) {
          await provider.send({
            jsonrpc: "2.0",
            id: `${i}`,
            method: "Ganache.MineTipset"
          });
        }

        assert.strictEqual(numTipsetsReceived, 5);

        const success = await provider.send({
          jsonrpc: "2.0",
          id: "6",
          method: SubscriptionMethod.ChannelClosed,
          params: [subscriptionId]
        });

        assert.strictEqual(success, true);

        await provider.send({
          jsonrpc: "2.0",
          id: `7`,
          method: "Ganache.MineTipset"
        });

        assert.strictEqual(numTipsetsReceived, 5);
      });
    });
  });
});
