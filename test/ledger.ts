import assert from "assert";
import GetProvider, { Provider } from "./helpers/getProvider";

describe("ledger", () => {
  // const expectedAddress = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";
  let provider: Provider;

  beforeEach(() => {
    provider = GetProvider();
  });

  it("eth_getBlockByNumber", async() => {
    // @TODO: Fix this horrible test
    const accounts = await provider.send("eth_accounts");
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await new Promise((resolve) => setTimeout(resolve, 100));
    const blocks = await Promise.all([provider.send("eth_getBlockByNumber", ["0x1", true]), provider.send("eth_getBlockByNumber", ["0x1"])]);
    console.log(JSON.stringify(blocks));

    const counts = await Promise.all([provider.send("eth_getBlockTransactionCountByNumber", ["0x1"]), provider.send("eth_getBlockTransactionCountByHash", [blocks[0].hash])]);
    console.log(counts);
    
    assert(true);
  });

  it("eth_getBlockByNumber", async() => {
    // @TODO: Fix this horrible test
    const accounts = await provider.send("eth_accounts");
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await new Promise((resolve) => setTimeout(resolve, 100));
    const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

    const blocks2 = await Promise.all([provider.send("eth_getBlockByHash", [block.hash, true]), provider.send("eth_getBlockByHash", [block.hash])]);
    console.log(JSON.stringify(blocks2));
    
    assert(true);
  });
})
