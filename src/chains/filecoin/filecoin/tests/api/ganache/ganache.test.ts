import assert from "assert";
import { FilecoinProvider } from "../../../src/provider";
import { SerializedMessage } from "../../../src/things/message";
import { SerializedMessageSendSpec } from "../../../src/things/message-send-spec";
import { SubscriptionMethod } from "../../../src/types/subscriptions";
import getProvider from "../../helpers/getProvider";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("ganache", () => {
    describe("Ganache.MineTipset", () => {
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
      let provider: FilecoinProvider;
      let client: LotusClient;
      const enabledChanges: boolean[] = [];

      before(async () => {
        provider = await getProvider({ miner: { blockTime: 0.1 } });
        client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
      });

      after(async () => {
        if (provider) {
          await provider.stop();
        }
      });

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

        const head1 = await client.chainHead();
        await new Promise(resolve => setInterval(resolve, 300));
        const head2 = await client.chainHead();
        assert.strictEqual(head2.Height, head1.Height);

        const accounts =
          await provider.blockchain.accountManager.getControllableAccounts();
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;
        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };
        await client.mpoolPushMessage(message, messageSendSpec);

        await new Promise(resolve => setInterval(resolve, 300));
        const head3 = await client.chainHead();
        assert.strictEqual(head3.Height, head2.Height);
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
        const head1 = await client.chainHead();
        await new Promise(resolve => setInterval(resolve, 300));
        const head2 = await client.chainHead();
        assert(head2.Height > head1.Height);

        const accounts =
          await provider.blockchain.accountManager.getControllableAccounts();
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;
        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };
        await client.mpoolPushMessage(message, messageSendSpec);

        await new Promise(resolve => setInterval(resolve, 300));
        const head3 = await client.chainHead();
        assert(head3.Height > head2.Height);
      });

      it("Ganache.MinerEnabledNotify", async () => {
        assert.strictEqual(enabledChanges.length, 2);
        assert.strictEqual(enabledChanges[0], false);
        assert.strictEqual(enabledChanges[1], true);
      });
    });
  });
});
