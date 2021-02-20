import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import { SubscriptionMethod } from "../../../src/types/subscriptions";
import getProvider from "../../helpers/getProvider";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("ganache", () => {
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

    describe("Ganache.MineTipset", () => {
      it("should return a serialized tipset with blocks", async () => {
        const { Height: priorHeight } = await client.chainHead();

        for (let i = 0; i < 5; i++) {
          await provider.send({
            jsonrpc: "2.0",
            id: "0",
            method: "Ganache.MineTipset"
          });
        }

        const { Height: currentHeight } = await client.chainHead();

        assert.strictEqual(currentHeight, priorHeight + 5);
      });
    });

    describe("Enabling/Disabling the Miner", () => {
      const enabledChanges: boolean[] = [];

      it("subscribes to miner enabled changes", async () => {
        await provider.sendSubscription(
          {
            jsonrpc: "2.0",
            id: "0",
            method: "Ganache.MinerEnabledNotify"
          },
          { subscription: true },
          message => {
            if (message.type === SubscriptionMethod.ChannelUpdated) {
              enabledChanges.push(message.data[1]);
            }
          }
        );
      });

      it("Ganache.MinerEnabled", async () => {
        const isEnabled = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.MinerEnabled"
        });

        assert.strictEqual(isEnabled, true);
        assert.strictEqual(provider.blockchain.minerEnabled, true);
      });

      it("Ganache.DisableMiner", async () => {
        await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.DisableMiner"
        });

        const isEnabled = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.MinerEnabled"
        });

        assert.strictEqual(isEnabled, false);
        assert.strictEqual(provider.blockchain.minerEnabled, false);
      });

      it("Ganache.EnableMiner", async () => {
        await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.EnableMiner"
        });

        const isEnabled = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.MinerEnabled"
        });

        assert.strictEqual(isEnabled, true);
        assert.strictEqual(provider.blockchain.minerEnabled, true);
      });

      it("Ganache.MinerEnabledNotify", async () => {
        assert.strictEqual(enabledChanges.length, 2);
        assert.strictEqual(enabledChanges[0], false);
        assert.strictEqual(enabledChanges[1], true);
      });
    });
  });
});
