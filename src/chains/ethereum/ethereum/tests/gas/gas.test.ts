import { assert } from "console";
import getProvider from "../helpers/getProvider";

describe("gas", () => {
  it.only(
    "it should estimate gas for running an end-of-line SSTORE accurately",
    async () => {
      const provider = await getProvider();
      const [from] = await provider.request({
        method: "eth_accounts",
        params: []
      });
      /*
        pragma solidity >=0.8.2 <0.9.0;

        contract Storage {
            uint256 number = 1;

            function reset() public {
                assembly {
                    sstore(0, 2)
                    sstore(0, 0)
                }
            }
        }
    */
      const data =
        "0x60806040526001600055348015601457600080fd5b506076806100236000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063d826f88f14602d575b600080fd5b60336035565b005b60026000556000805556fea2646970667358221220d729f364bc77b685ca7c79fbcb563c82e14a1f50aecc0b48fe6f61b5f42ac81064736f6c63430008120033";
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from, data, gas: "0x100000" }]
      });
      const result = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [hash]
      });
      console.log(result);
      const contractAddress = result.contractAddress;
      const signature = "d826f88f";
      const sim = await provider.request({
        method: "evm_simulateTransactions",
        params: [
          {
            transactions: [
              {
                to: contractAddress,
                data: "0x" + signature
              }
            ],
            gasEstimation: "call-depth"
          }
        ]
      });
      assert(sim[0].gasEstimate !== undefined);
      const sim2 = await provider.request({
        method: "evm_simulateTransactions",
        params: [
          {
            transactions: [
              {
                to: contractAddress,
                data: "0x" + signature,
                gas: `0x${(parseInt(sim[0].gasEstimate) - 1).toString(16)}`
              }
            ],
            gasEstimation: "call-depth"
          }
        ]
      });
      assert((sim2[0] as any).error.error, "out of gas");
    }
  ).timeout(0);
});
