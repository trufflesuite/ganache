const assert = require("assert");
const to = require("../../../lib/utils/to.js");
const numberToBN = require("number-to-bn");

const confirmGasPrice = async(
  expectedGasPrice,
  setGasPriceOnTransaction = false,
  web3,
  accounts,
  transferAmount = "5"
) => {
  // Convert transferAmount into a big number
  const _transferAmount = web3.utils.toWei(numberToBN(transferAmount), "finney");

  // Convert expected gas price into a big number
  const expectedGasPriceBN = numberToBN(expectedGasPrice);

  // Get balance of account
  const balance = await web3.eth.getBalance(accounts[0]);

  // Convert balance into a big number
  const initialBalance = numberToBN(balance);

  const params = {
    from: accounts[0],
    to: accounts[1],
    value: _transferAmount
  };

  // Check to set the gas price
  if (setGasPriceOnTransaction) {
    params.gasPrice = expectedGasPriceBN;
  }
  // Transfer funds between two accounts
  const receipt = await web3.eth.sendTransaction(params);

  // Convert gasUsed to a big number
  const gasUsed = numberToBN(receipt.gasUsed);

  // Get balance of sender account
  const finalBalance = await web3.eth.getBalance(accounts[0]);

  // Subtract the initial balance from the final balance
  const deltaBalance = initialBalance.sub(numberToBN(finalBalance));

  // the amount we paid in excess of our transferAmount is what we spent on gas
  const gasExpense = deltaBalance.sub(_transferAmount);

  assert(!gasExpense.eq(numberToBN("0")), "Calculated gas expense must be nonzero.");

  // gas expense is just gasPrice * gasUsed, so just solve accordingly
  const actualGasPriceBN = gasExpense.div(gasUsed);

  assert(
    expectedGasPriceBN.eq(actualGasPriceBN),
    `Gas price used by EVM (${to.hex(actualGasPriceBN)}) was different from` +
      ` expected gas price (${to.hex(expectedGasPriceBN)})`
  );
};

module.exports = confirmGasPrice;
