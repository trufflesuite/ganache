import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
const RPC_MODULES = {
  eth: "1.0",
  net: "1.0",
  rpc: "1.0",
  web3: "1.0",
  evm: "1.0",
  personal: "1.0"
} as const;

describe("api", () => {
  describe("rpc", () => {
    let provider: EthereumProvider;
    before(async () => {
      provider = await getProvider();
    });

    it("rpc_modules returns the modules", async () => {
      const result = await provider.send("rpc_modules");
      assert.deepStrictEqual(result, RPC_MODULES);
    });
  });
});
