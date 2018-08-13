const to = require('../../lib/utils/to');
const Web3 = require('web3');
const assert = require('assert');
const Ganache = require("../../index");
const path = require("path");

const compileAndDeploy = require ('../helpers/contracts').compileAndDeploy

const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

describe('options:gasLimit', function() {
  let options = {mnemonic}
  let provider = null
  let web3 = null
  let accounts = []
  let contractArtifact = {}
  let instance = null

  before ('setup web3', async function() {
    provider = new Ganache.provider(options)
    web3 = new Web3(provider)
  })

  before('get accounts', async function() {
    accounts = await web3.eth.getAccounts()
  })

  before("compile source", async function() {
    this.timeout(10000)
    let contractName = 'Example'
    contractArtifact = await compileAndDeploy(path.join(__dirname, '..', `${contractName}.sol`), contractName, web3)
    instance = contractArtifact.instance
  })

  it('should respect the default gasPrice', async function() {
    let assignedGasPrice = provider.engine.manager.state.gasPriceVal;

    let receipt = await instance.methods.setValue('0x10').send({from: accounts[0], gas: 3141592})

    let transactionHash = receipt.transactionHash;
    let tx = await web3.eth.getTransaction(transactionHash)
    let gasPrice = tx.gasPrice

    assert.deepEqual(to.hex(gasPrice), to.hex(assignedGasPrice))
  })

});


