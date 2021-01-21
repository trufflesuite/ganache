import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { CID } from "../../../src/things/cid";
import LotusSchema from "@filecoin-shipyard/lotus-client-schema";
import GanacheSchema from "../../../src/schema";

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

      it("should return invalid methods for all unimplemented methods", async () => {
        const methods = Object.keys(LotusSchema.mainnet.fullNode.methods)
          .filter(
            method => typeof GanacheSchema.methods[method] === "undefined"
          )
          .map(method => `Filecoin.${method}`);

        for (const method of methods) {
          try {
            await provider.send({
              jsonrpc: "2.0",
              id: "0",
              method: method as any,
              params: []
            });
          } catch (e) {
            assert.strictEqual(
              e.message,
              `The method ${method} does not exist/is not available`
            );
            continue;
          }

          assert.fail(`Unsupported method ${method} was sent successfully`);
        }
      });
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
