// const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe.only("Transaction Data", () => {
  let context;

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["TransactionData"],
      contractSubdirectory: "transaction-data"
    };
    context = await bootstrap(contractRef);
    console.log(context);
  });

  it("should do thingsss", async() => {
    // let { instance, accounts, web3 } = context;
    // const result = await web3.eth.sendTransaction({
    //   from: accounts[0],
    //   to: instance._address,
    //   gas: 31000,
    //   // correctly formatted vs incorrectly formmated "0x1"
    //   data: "0x1",
    //   value: 1
    // });
    // console.log(result);
    // assert.strictEqual(result, "smething");
  });

  //   it("should handle incorrectly formatted data", async() => {
  //     let { accounts, web3 } = context;
  //     const result = await web3.eth.sendTransaction({
  //       from: accounts[0],
  //       // correctly formatted vs incorrectly formmated "0x1"
  //       data: "0x1",
  //       gas: 31000,
  //       value: 1
  //     });

  //     // this tx should not go thru, but it does
  //     console.log(result);

  //     // const msgData = await contractInstance.methods.getMsgData().call();
  //     // console.log(msgData);
  //   });
});
