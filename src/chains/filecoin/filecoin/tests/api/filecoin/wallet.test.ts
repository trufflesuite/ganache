import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Address } from "../../../src/things/address";

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

    describe("Filecoin.WalletDefaultAddress", () => {
      it("should return a single address", async () => {
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address.length, 86);
        assert.strictEqual(address.indexOf("t3"), 0);
        assert(Address.isValid(address));
      });
    });

    describe("Filecoin.WalletBalance", () => {
      let address: string;

      before(async () => {
        address = await client.walletDefaultAddress();
      });

      it("should return a balance for the default address", async () => {
        const balance = await client.walletBalance(address);
        assert.strictEqual(balance, "100000000000000000000");
      });

      it("should not return a balance for any other address", async () => {
        let otherAddress = Address.random().value;
        const balance = await client.walletBalance(otherAddress);
        assert.strictEqual(balance, "0");
      });
    });
  });
});
