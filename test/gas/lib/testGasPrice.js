const assert = require("assert");
const to = require("../../../lib/utils/to.js");
const numberToBN = require("number-to-bn");

const testGasPrice = async(expectedGasPrice, setGasPriceOnTransaction = false, web3, accounts) => {
  const transferAmount = numberToBN(web3.utils.toWei("5", "finney"));
  const expectedGasPriceBN = numberToBN(expectedGasPrice);
  const balance = await web3.eth.getBalance(accounts[0]);
  const initialBalance = numberToBN(balance);

  const params = {
    from: accounts[0],
    to: accounts[1],
    value: transferAmount
  };

  if (setGasPriceOnTransaction) {
    params.gasPrice = expectedGasPriceBN;
  }

  const receipt = await web3.eth.sendTransaction(params);
  const gasUsed = numberToBN(receipt.gasUsed);

  const finalBalance = await web3.eth.getBalance(accounts[0]);
  const deltaBalance = initialBalance.sub(numberToBN(finalBalance));

  // the amount we paid in excess of our transferAmount is what we spent on gas
  const gasExpense = deltaBalance.sub(transferAmount);

  assert(!gasExpense.eq(numberToBN("0")), "Calculated gas expense must be nonzero.");

  // gas expense is just gasPrice * gasUsed, so just solve accordingly
  const actualGasPrice = gasExpense.div(gasUsed);
  console.log(expectedGasPriceBN, actualGasPrice);

  assert(
    expectedGasPriceBN.eq(actualGasPrice),
    `Gas price used by EVM (${to.hex(actualGasPrice)}) was different from` +
      ` expected gas price (${to.hex(expectedGasPriceBN)})`
  );
};

module.exports = testGasPrice;
