import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;


export type LotusClient = any;
import CID from "../../../src/things/cid";
import Address from "../../../src/things/address";

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
        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });

      // TODO: Test for unsupported methods
    });

    describe("Filecoin.ChainGetGenesis", () => {
      it("should return a value", async() => {
        const genesis = await client.chainGetGenesis();
        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });
    });
    
    describe("Filecoin.ChainHead", () => {
      it("should return a serialized tipset with blocks", async() => {
        const head = await client.chainHead();
        assert(head.Blocks.length > 0)
      })
    });

    describe("Filecoin.StateListMiners", () => {
      it("should return a single miner", async() => {
        const miners = await client.stateListMiners();
        assert.strictEqual(miners.length, 1);
        assert.strictEqual(miners[0], "t01000");
      })
    })

    describe("Filecoin.WalletDefaultAddress", () => {
      it("should return a single address", async() => {
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address.length, 86);
        assert.strictEqual(address.indexOf("t3"), 0);
        assert(Address.isValid(address));
      })
    })

    describe("Filecoin.WalletBalance", () => {
      let address:string;

      beforeEach(async() => {
        address = await client.walletDefaultAddress();
      })

      it("should return a balance for the default address", async() => {
        const balance = await client.walletBalance(address);
        assert.strictEqual(balance, "500000000000000000000000");
      })

      it("should not return a balance for any other address", async() => {
        let otherAddress = new Address().value;
        const balance = await client.walletBalance(otherAddress);
        assert.strictEqual(balance, "0");
      })
    })
  });
});
