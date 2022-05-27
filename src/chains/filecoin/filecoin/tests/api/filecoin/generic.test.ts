import assert from "assert";
import { FilecoinProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { CID } from "../../../src/things/cid";
import LotusSchema from "@filecoin-shipyard/lotus-client-schema";
import GanacheSchema from "../../../src/schema";
import FilecoinApi from "../../../src/api";

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
        const combinedMethods = {
          ...LotusSchema.mainnet.fullNode.methods,
          ...LotusSchema.mainnet.storageMiner.methods,
          ...LotusSchema.mainnet.gatewayApi.methods,
          ...LotusSchema.mainnet.walletApi.methods,
          ...LotusSchema.mainnet.workerApi.methods
        };
        const methods = Object.keys(combinedMethods)
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
          } catch (e: any) {
            assert.strictEqual(
              e.message,
              `The method ${method} does not exist/is not available`
            );
            continue;
          }

          assert.fail(`Unsupported method ${method} was sent successfully`);
        }
      });

      it("should only have valid Filecoin.<...> methods", async () => {
        const combinedMethods = {
          ...LotusSchema.mainnet.fullNode.methods,
          ...LotusSchema.mainnet.storageMiner.methods,
          ...LotusSchema.mainnet.gatewayApi.methods,
          ...LotusSchema.mainnet.walletApi.methods,
          ...LotusSchema.mainnet.workerApi.methods
        };
        const methods = Object.getOwnPropertyNames(FilecoinApi.prototype)
          .filter(
            method => method !== "constructor" && method.startsWith("Filecoin.")
          )
          .map(method => method.replace("Filecoin.", ""));

        for (const method of methods) {
          if (typeof combinedMethods[method] === "undefined") {
            assert.fail(
              `Filecoin method Filecoin.${method} is implemented, but not part of the official schema`
            );
          }
        }
      });
    });

    describe("Filecoin.Version", () => {
      it("should return a value", async () => {
        const versionInfo = await client.version();

        assert(versionInfo.Version.includes("@ganache/filecoin v"));

        assert.strictEqual(typeof versionInfo.APIVersion, "number");
        assert(versionInfo.APIVersion > 0);

        // should be 0 since we didn't specify in options
        assert.strictEqual(versionInfo.BlockDelay, "0");
      });
    });

    describe("Filecoin.ID", () => {
      it("should return a value", async () => {
        const id = await client.ID();

        assert.strictEqual(
          id,
          "bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg"
        );
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
        assert.strictEqual(head.Height, 0);
        assert(head.Blocks.length > 0);
        assert.strictEqual(head.Blocks[0].Height, head.Height);
      });
    });

    describe("Filecoin.ChainGetTipSet", () => {
      it("should return a serialized tipset with blocks", async () => {
        const head = await client.chainHead();
        const tipset = await client.chainGetTipSet(head.Cids);
        assert.strictEqual(tipset.Height, head.Height);
        assert(tipset.Blocks.length === head.Blocks.length);
        assert.strictEqual(tipset.Blocks[0].Height, tipset.Height);
      });
    });

    describe("Filecoin.ChainGetTipSetByHeight", () => {
      it("should return a tipset with blocks using only the height", async () => {
        const tipset = await client.chainGetTipSetByHeight(0);
        assert.strictEqual(tipset.Height, 0);
        assert(tipset.Blocks.length > 0);
        assert.strictEqual(tipset.Blocks[0].Height, tipset.Height);
      });

      it("should return a tipset with blocks using both height and tipset key", async () => {
        const head = await client.chainHead();
        const tipset = await client.chainGetTipSetByHeight(0, head.Cids);
        assert.strictEqual(tipset.Height, 0);
        assert(tipset.Blocks.length > 0);
        assert.strictEqual(tipset.Blocks[0].Height, tipset.Height);
      });

      it("should fail to retrieve a tipset if the height is larger than the tipset key's height", async () => {
        await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.MineTipset"
        });

        const genesisTipset = await client.chainGetGenesis();
        const head = await client.chainHead();

        assert(head.Height > genesisTipset.Height);

        try {
          await client.chainGetTipSetByHeight(head.Height, genesisTipset.Cids);
          assert.fail(
            "Successfully received tipset with incorrect tipset key/height"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "looking for tipset with height greater than start point"
            ),
            e.message
          );
        }
      });
    });

    describe("Filecoin.ChainGetBlock", () => {
      it("should retrieve a block directly by CID", async () => {
        const tipset = await client.chainHead();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const block = await client.chainGetBlock(tipset.Cids[0]);
        assert.deepStrictEqual(block, tipset.Blocks[0]);
      });
    });
  });
});
