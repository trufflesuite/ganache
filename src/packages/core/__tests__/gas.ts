import Ganache from "../src";
import * as assert from "assert";
import EthereumProvider from "@ganache/ethereum/src/provider";

describe("gas", () => {
  let ganache: EthereumProvider;
  
  before(() => {
    ganache = Ganache.provider() as EthereumProvider;
  })
  
  it.only("works", async () => {
    const accounts = await ganache.send("eth_accounts");
    const response = await ganache.send("eth_estimateGas", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 100000
      }
    ]);
    console.log(response);

  });
});
