const assert = require("assert");
const { BN } = require("ethereumjs-util");
const Transaction = require("../lib/utils/transaction");

describe("Transaction", function() {
  it("Should adhere to EIP-155", function() {
    const gasPrice = 20 * 10 ** 9; // 20000000000
    const value = `0x${new BN(10).pow(new BN(18)).toString("hex")}`;

    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const privateKey = Buffer.from("46".repeat(32), "hex");

    const txParams = {
      nonce: 9,
      gasPrice,
      gasLimit: 21000,
      to: `0x${"35".repeat(20)}`,
      value,
      data: "",
      chainId: 1 // EIP 155 chainId - mainnet: 1, ropsten: 3
    };

    const tx = new Transaction(txParams);
    // Signing data
    assert.strictEqual(
      tx.serialize().toString("hex"),
      "ec098504a817c800825208943535353535353535353535353535353535353535880de0b6b3a764000080018080",
      "Signing data is incorrect"
    );

    const txHash = tx.hash();
    // Signing hash
    assert.strictEqual(
      txHash.toString("hex"),
      "daf5a779ae972f972197303d7b574746c7ef83eadac0f2791ad23db92e4c8e53",
      "Signing hash is incorrect"
    );

    tx.sign(privateKey);
    // Signed Tx
    assert.strictEqual(
      tx.serialize().toString("hex"),
      // eslint-disable-next-line max-len
      "f86c098504a817c800825208943535353535353535353535353535353535353535880de0b6b3a76400008025a028ef61340bd939bc2195fe537567866003e1a15d3c71ff63e1590620aa636276a067cbe9d8997f761aecb703304b3800ccf555c9f3dc64214b297fb1966a3b6d83",
      "Signed TX is incorrect"
    );

    // Tx hash
    assert.strictEqual(
      tx.hash().toString("hex"),
      "33469b22e9f636356c4160a87eb19df52b7412e8eac32a4a55ffe88ea8350788",
      "Tx hash is incorrect"
    );
  });
});
