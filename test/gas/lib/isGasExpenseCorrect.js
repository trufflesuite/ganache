const assert = require("assert");
const to = require("../../../lib/utils/to.js");

const isGasExpenseCorrect = async(expectedGasPrice, setGasPriceOnTransaction = false, web3, accounts) => {
  const transferAmount = web3.utils.toBN(web3.utils.toWei("5", "finney"));
  const expectedGasPriceBN = web3.utils.toBN(expectedGasPrice);

  const balance = await web3.eth.getBalance(accounts[0]);
  const initialBalance = await web3.utils.toBN(balance);

  const params = {
    from: accounts[0],
    to: accounts[1],
    value: transferAmount
  };

  if (setGasPriceOnTransaction) {
    params.gasPrice = expectedGasPriceBN;
  }

  const receipt = await web3.eth.sendTransaction(params);
  const gasUsed = web3.utils.toBN(receipt.gasUsed);

  const finalBalance = web3.utils.toBN(await web3.eth.getBalance(accounts[0]));
  const deltaBalance = initialBalance.sub(finalBalance);

  // the amount we paid in excess of our transferAmount is what we spent on gas
  const gasExpense = deltaBalance.sub(transferAmount);

  assert(!gasExpense.eq(web3.utils.toBN("0")), "Calculated gas expense must be nonzero.");

  // gas expense is just gasPrice * gasUsed, so just solve accordingly
  const actualGasPrice = gasExpense.div(gasUsed);

  assert(
    expectedGasPriceBN.eq(actualGasPrice),
    `Gas price used by EVM (${to.hex(actualGasPrice)}) was different from` +
      ` expected gas price (${to.hex(expectedGasPriceBN)})`
  );
};

module.exports = isGasExpenseCorrect;
