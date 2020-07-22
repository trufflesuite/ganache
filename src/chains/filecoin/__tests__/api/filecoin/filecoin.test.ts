import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;
const schema = require("@filecoin-shipyard/lotus-client-schema");

export type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    beforeEach(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, {schema: schema.testnet.fullNode});
    });

    describe("General request processing", () => {
      it("should return a value over JSON RPC", async() => {
        // Note the Filecoin Provider strips the JSON RPC details
        // from the response.
        const genesis = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Filecoin.ChainGetGenesis"
        });
        assert.strictEqual(genesis["Cids"][0]["/"], "bafy2bzacecgowiba5yiquglvhwjbtl74vvs7v4qhjj7dfk3tygduekr32a5r4");
      });
    });

    describe("Filecoin.ChainGetGenesis", () => {
      it("should return a value", async() => {
        const genesis = await client.chainGetGenesis();
        assert.strictEqual(genesis["Cids"][0]["/"], "bafy2bzacecgowiba5yiquglvhwjbtl74vvs7v4qhjj7dfk3tygduekr32a5r4");
      });
    });

  });
});
