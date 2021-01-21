import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { CID } from "../../../src/things/cid";

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
      await provider.stop();
    });

    describe("General request processing", () => {
      it("should return a value over JSON RPC", async () => {
        // Note the Filecoin Provider strips the JSON RPC details
        // from the response.
        const genesis = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Filecoin.ChainGetGenesis"
        });

        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });

      // TODO: Test for unsupported methods
    });

    describe("Filecoin.ChainGetGenesis", () => {
      it("should return a value", async () => {
        const genesis = await client.chainGetGenesis();
        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });
    });

    describe("Filecoin.ChainHead", () => {
      it("should return a serialized tipset with blocks", async () => {
        const head = await client.chainHead();
        assert(head.Blocks.length > 0);
      });
    });
  });
});
