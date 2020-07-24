import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;


export type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    beforeEach(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, {schema: FilecoinProvider.Schema});
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
        assert.strictEqual(genesis["Cids"][0]["/"], "bafy2bzacecgw6dqj4bctnbnyqfujltkwu7xc7ttaaato4i5miroxr4bayhfea");
      });

      // TODO: Test for unsupported methods
    });

    describe("Filecoin.ChainGetGenesis", () => {
      it("should return a value", async() => {
        const genesis = await client.chainGetGenesis();
        assert.strictEqual(genesis["Cids"][0]["/"], "bafy2bzacecgw6dqj4bctnbnyqfujltkwu7xc7ttaaato4i5miroxr4bayhfea");
      });
    });
    
    describe("Filecoin.ChainHead", () => {
      it("should create return a tipset with blocks", async() => {
        const head = await client.chainHead();
        console.log(head)
        assert(head.Blocks.length > 0)
      })
    });

  });
});
