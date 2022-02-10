# Miner Design Decisions

##### [Commit 33aae901f1ba4941e33dea9c5f3a9b3ae9145d37](https://github.com/trufflesuite/ganache/commit/33aae901f1ba4941e33dea9c5f3a9b3ae9145d37)

- Miner no longer sees if ganache is configured with instamine mode.
  - Instead, the miner just trusts the `maxTransactions` and `onlyOneBlock` flags.

Miner behavior

- From `blockchain.ts`, when `this.resume` and thus `this.mine(Capacity.FillBlock)` is called when in instamine mode, the miner will mine all transactions in the txPool. If there are enough transactions to fill multiple blocks, multiple blocks will be mined until the txPool is empty, then normal instamine behaviour will resume.
- From `blockchain.ts` when `this.mine(maxTransactions)` is called, either one transaction will be mined per block (instamine mode), or any number of transactions will be allowed, limited by the `blockGasLimit` (block time mode).
  - Though it is not yet exposed to the api, the miner is set up to allow the user to specify the number of transactions allowed per block, which could be a useful feature.
- From the api, when `evm_mine` and thus `mine(Capacity.FillBlock, timestamp, true)` is called, a single block will be mined with no limit on the number of transactions per block (aside from the standard `blockGasLimit`). A block will be mined even if txPool is empty.
- From the api, when `evm_setAccountNonce`, `evm_setAccountBalance`, `evm_setAccountCode` or `evm_setAccountStorageAt` and thus `blockchain.mine(Capacity.Empty)` is called, a single, empty block is mined.
