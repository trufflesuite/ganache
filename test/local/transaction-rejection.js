const bootstrap = require("../helpers/contract/bootstrap");
const assert = require("assert");

describe("Transaction rejection", function() {
  let context;

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const contractRef = {
      contractFiles: ["EstimateGas"],
      contractSubdirectory: "gas"
    };

    const ganacheProviderOptions = {
      // important: we want to make sure we get tx rejections as rpc errors even
      // if we don't want runtime errors as RPC erros
      vmErrorsOnRPCResponse: false
    };

    context = await bootstrap(contractRef, ganacheProviderOptions);
  });

  before("lock account 1", async function() {
    const { accounts, web3 } = context;
    await web3.eth.personal.lockAccount(accounts[1]);
  });

  it("should reject transaction if nonce is incorrect", async function() {
    await testTransactionForRejection(
      {
        nonce: 0xffff
      },
      "the tx doesn't have the correct nonce"
    );
  });

  it("should reject transaction if from account is missing", async function() {
    await testTransactionForRejection(
      {
        from: undefined
      },
      "from not found; is required"
    );
  });

  it("should reject transaction if from account is invalid/unknown", async function() {
    await testTransactionForRejection(
      {
        from: "0x0000000000000000000000000000000000000001"
      },
      "sender account not recognized"
    );
  });

  it("should reject transaction if from known account which is locked", async function() {
    const { accounts } = context;
    await testTransactionForRejection(
      {
        from: accounts[1]
      },
      "signer account is locked"
    );
  });

  it("should reject transaction if gas limit exceeds block gas limit", async function() {
    await testTransactionForRejection(
      {
        gas: 0xffffffff
      },
      "Exceeds block gas limit"
    );
  });

  it("should reject transaction if insufficient funds", async function() {
    const { web3 } = context;
    await testTransactionForRejection(
      {
        value: web3.utils.toWei("100000", "ether")
      },
      "sender doesn't have enough funds to send tx"
    );
  });

  let counter = 1;
  async function testTransactionForRejection(paramsOverride, expectedMessage) {
    const { accounts, instance, provider, web3 } = context;
    // this is a special `send` fn that doesn't reject and ignores the callback `error` param
    const send = async(method, ...params) =>
      new Promise((resolve) =>
        provider.send(
          {
            id: counter++,
            jsonrpc: "2.0",
            method,
            params: [...params]
            // we ignore the error because we just want to check the response obj for these tests
          },
          (_err, response) => resolve(response)
        )
      );

    const params = Object.assign(
      {
        from: accounts[0],
        to: instance.options.address,
        data:
          "0x91ea8a0554696d0000000000000000000000000000000000000000000000000" +
          "00000000041206772656174206775790000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000005"
      },
      paramsOverride
    );

    // don't send with web3 because it'll inject its own checks
    const response = await send("eth_sendTransaction", params).catch((e) => ({ error: e }));

    if (response.error) {
      if (response.error.message) {
        assert(
          response.error.message.startsWith(expectedMessage),
          `Expected error message matching ${expectedMessage}, got ${response.error.message}`
        );
      } else {
        assert.fail(new Error("Error was returned which had no message"));
      }
    } else if (response.result) {
      const receipt = await web3.eth.getTransactionReceipt(response.result);
      if (!receipt.status) {
        assert.fail(new Error("TX rejections should return error, but returned receipt with falsey status instead"));
      } else {
        assert.fail(
          new Error(
            `TX should have rejected prior to running. Instead transaction ran successfully (receipt.status == 
              ${receipt.status})`
          )
        );
      }
    } else {
      assert.fail(new Error("eth_sendTransaction responded with empty RPC response"));
    }
  }
});
