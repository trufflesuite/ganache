async function deployContract(abi, accounts, bytecode, web3) {
  const contract = new web3.eth.Contract(abi);
  return contract.deploy({ data: bytecode }).send({ from: accounts[0], gas: 3141592 });
}

module.exports = deployContract;
