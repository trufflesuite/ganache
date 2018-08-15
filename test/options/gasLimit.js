const Web3 = require('web3');
const assert = require('assert');
const Ganache = require("../../index.js");
const path = require("path");

const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

describe('options:gasLimit', function() {
  let options = {mnemonic}
  let provider = null
  let web3 = null
  let accounts = []

  before ('setup web3', async function() {
    provider = new Ganache.provider(options)
    web3 = new Web3(provider)
  })

  before('get accounts', async function() {
    accounts = await web3.eth.getAccounts()
  })

  it('should respect the assigned gasLimit', async function() {
    let assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
    let block = await web3.eth.getBlock('latest')
    assert.deepEqual(block.gasLimit, assignedGasLimit)
  })
});


