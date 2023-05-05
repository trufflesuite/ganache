import assert from "assert";
import { Provider } from "../src/provider";
describe("provider test", () => {
  it("transfers balance", async () => {
    const provider = new Provider({
      wallet: {
        accounts: ["0x1", "0x2"],
        defaultBalance: "0x200"
      }
    });

    const result = await provider.send("sendFunds", ["0x1", "0x2", "0x100"]);
    assert.deepStrictEqual(result, {
      fromBalance: "0x100",
      toBalance: "0x300"
    });
  });
});
