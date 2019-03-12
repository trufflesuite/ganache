const bootstrap = require("./helpers/contract/bootstrap");
const to = require("../lib/utils/to");

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

  before("lock account 1", function() {
    const { accounts, web3 } = context;
    web3.eth.personal.lockAccount(accounts[1]);
  });

  it("should reject transaction if nonce is incorrect", function(done) {
    testTransactionForRejection(
      {
        nonce: 0xffff
      },
      /the tx doesn't have the correct nonce/,
      done
    );
  });

  it("should reject transaction if from account is missing", function(done) {
    testTransactionForRejection(
      {
        from: undefined
      },
      /from not found; is required/,
      done
    );
  });

  it("should reject transaction if from account is invalid/unknown", function(done) {
    testTransactionForRejection(
      {
        from: "0x0000000000000000000000000000000000000001"
      },
      /sender account not recognized/,
      done
    );
  });

  it("should reject transaction if from known account which is locked", function(done) {
    const { accounts } = context;
    testTransactionForRejection(
      {
        from: accounts[1]
      },
      /signer account is locked/,
      done
    );
  });

  it("should reject transaction if gas limit exceeds block gas limit", function(done) {
    testTransactionForRejection(
      {
        gas: 0xffffffff
      },
      /Exceeds block gas limit/,
      done
    );
  });

  it("should reject transaction if insufficient funds", function(done) {
    const { web3 } = context;
    testTransactionForRejection(
      {
        value: web3.utils.toWei("100000", "ether")
      },
      /sender doesn't have enough funds to send tx/,
      done
    );
  });

  function testTransactionForRejection(paramsOverride, messageRegex, done) {
    const { accounts, instance, provider, web3 } = context;
    const estimateGasContractAddress = to.hex(instance.options.address);

    const params = Object.assign(
      {
        from: accounts[0],
        to: estimateGasContractAddress,
        gas: to.hex(3141592),
        data:
          "0x91ea8a0554696d0000000000000000000000000000000000000000000000000" +
          "00000000041206772656174206775790000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000005"
      },
      paramsOverride
    );

    let request = {
      jsonrpc: 2.0,
      id: new Date().getTime(),
      method: "eth_sendTransaction",
      params: [params]
    };

    // don't send with web3 because it'll inject its own checks
    provider.send(request, async(_, response) => {
      // cyclomatic complexity? what's that? :-(
      if (response.error) {
        if (response.error.message) {
          if (messageRegex.test(response.error.message)) {
            // success!
            return done();
          } else {
            // wrong error message
            return done(new Error(`Expected error message matching ${messageRegex}, got ${response.error.message}`));
          }
        } else {
          return done(new Error("Error was returned which had no message"));
        }
      } else if (response.result) {
        const result = await web3.eth.getTransactionReceipt(response.result);
        if (to.number(result.status) === 0) {
          return new Error("TX rejections should return error, but returned receipt with zero status instead");
        } else {
          return done(
            new Error(
              `TX should have rejected prior to running. Instead transaction ran successfully (receipt.status == 
                ${to.number(result.status)})`
            )
          );
        }
      } else {
        return done(new Error("eth_sendTransaction responded with empty RPC response"));
      }
    });
  }
});
