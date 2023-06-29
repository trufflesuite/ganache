import assert from "assert";
import getProvider from "../helpers/getProvider";

describe("gas", () => {
  /*
pragma solidity >=0.8.2 <0.9.0;

contract Storage {
    uint256 number = 1;

    function doStore() public {
        assembly {
            sstore(0, 2)
            sstore(0, 0)
        }
    }
    function doCall(address addy) public {
        bytes memory encoded = abi.encodeWithSignature("doStore()");
        addy.call(encoded, 0, 2300);
        assembly {
            let result := call(gas(), addy, 0, add(encoded, 0x20), mload(encoded), 0, 0)

            if eq(result, 0) {
                revert(0, returndatasize())
            }
        }
    }
}
  */

  const data =
    "0x6080604052600160005534801561001557600080fd5b506101d9806100256000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806362fdb9be1461003b578063d69e37da14610045575b600080fd5b610043610061565b005b61005f600480360381019061005a9190610176565b61006c565b005b600260005560008055565b60006040516024016040516020818303038152906040527f62fdb9be000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff838183161783525050505090506000808251602084016000865af16000810361010e573d6000fd5b505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061014382610118565b9050919050565b61015381610138565b811461015e57600080fd5b50565b6000813590506101708161014a565b92915050565b60006020828403121561018c5761018b610113565b5b600061019a84828501610161565b9150509291505056fea2646970667358221220569622c6df02d3d85b00665649493d10c368e96105864994ec2ebc9d73c281bf64736f6c63430008120033";

  let provider: any;
  let from: string;
  let contractAddress: string;
  beforeEach("set up provider and contract", async () => {
    provider = await getProvider();
    [from] = await provider.request({
      method: "eth_accounts",
      params: []
    });
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, data, gas: "0x100000" }]
    });
    const result = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash]
    });
    contractAddress = result.contractAddress;
  });

  async function simulateTransaction(signature: string, gas?: string) {
    const tx: any = {
      to: contractAddress,
      data: "0x" + signature,
      gas: gas || undefined
    };
    const json: any = {
      method: "evm_simulateTransactions",
      params: [
        {
          transactions: [tx],
          estimateGas: true
        }
      ]
    };
    return await provider.request(json);
  }

  it("it should estimate gas for running an end-of-line SSTORE accurately", async () => {
    const signature = "62fdb9be"; // doStore()
    const sim1 = await simulateTransaction(signature);
    assert(sim1[0].gasEstimate !== undefined);

    const sim2 = await simulateTransaction(signature, sim1[0].gasEstimate);
    assert.deepStrictEqual(
      sim2,
      sim1,
      "should not run out of gas when using estimate"
    );

    const sim3 = await simulateTransaction(
      signature,
      `0x${(sim1[0].gasEstimate - 1).toString(16)}`
    );
    assert.strictEqual(
      (sim3[0] as any).error.error,
      "out of gas",
      "should run out of gas when using estimate - 1"
    );
  }).timeout(0);

  it.only(
    "it should estimate gas for running an end-of-line SSTORE within a CALL accurately",
    async () => {
      // this test calls doCall(address) which in turn calls doStore(), but in a
      // CALL context. This is intended to test OOG behavior within the CALL
      // due to the last SSTORE requiring `2300` gas.
      const signature = "d69e37da" + contractAddress.slice(2).padStart(64, "0"); // doCall(address)
      const sim1 = await simulateTransaction(signature);
      assert(sim1[0].gasEstimate !== undefined);

      const sim2 = await simulateTransaction(signature, sim1[0].gasEstimate);
      assert.deepStrictEqual(
        sim2,
        sim1,
        "should not run out of gas when using estimate"
      );

      const sim3 = await simulateTransaction(
        signature,
        `0x${(sim1[0].gasEstimate - 1).toString(16)}`
      );
      assert.strictEqual(
        (sim3[0] as any).error && (sim3[0] as any).error.error,
        "revert", // the call failure looks like a revert
        "should run out of gas when using estimate - 1"
      );
    }
  ).timeout(0);
});
