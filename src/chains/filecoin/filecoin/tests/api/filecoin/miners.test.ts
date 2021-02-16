import assert from "assert";
import FilecoinProvider from "../../../src/provider";
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

    describe("Filecoin.StateListMiners", () => {
      it("should return a single miner", async () => {
        const miners = await client.stateListMiners();
        assert.strictEqual(miners.length, 1);
        assert.strictEqual(miners[0], "t01000");
      });
    });
  });
});
