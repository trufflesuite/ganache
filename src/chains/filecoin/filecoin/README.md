# `@ganache/filecoin`

This package provides Ganache's Filecoin client implementation.

## Table of Contents

1. [CLI Usage](#cli-usage)
1. [NodeJS Usage](#nodejs-usage)
1. [Startup Options](#startup-options)
1. [Supported RPC Methods](#supported-rpc-methods)

## CLI Usage

To use Filecoin-flavored Ganache via the CLI, follow the below instructions:

1. Remove any existing version of Ganache CLI
   ```bash
   npm uninstall --global ganache-cli
   npm uninstall --global ganache
   ```
1. Install the `ganache` package globally with the `filecoin` tag (note that we're **not** installing the old `ganache-cli` package)
   ```bash
   npm install --global ganache@filecoin
   ```
1. Install the `@ganache/filecoin` globally
   ```bash
   npm install --global @ganache/filecoin
   ```
1. Run Filecoin-flavored Ganache
   ```bash
   ganache filecoin
   ```
1. See available [options](#startup-options)
   ```bash
   ganache filecoin --help
   ```
1. You can use Ethereum-flavored Ganache still

   ```bash
   # Running "ganache" defaults to Ethereum
   ganache

   # or you can specify ethereum as the flavor
   ganache ethereum
   ```

## NodeJS Usage

### Install

If you're using Filecoin-flavored Ganache as a NodeJS dependency, you need to make sure you install both the `ganache` package (with the `filecoin` tag) and the `@ganache/filecoin` package.

```bash
# install the base Ganache package
npm install ganache@filecoin

# install the Filecoin peer dependency package
npm install @ganache/filecoin
```

### Usage

In your code, you will use the `ganache` package directly to instantiate the Filecoin flavor. Below is an example on how to do that with the default [options](#startup-options).

```javascript
import Ganache from "ganache";

const startupOptions = {
  flavor: "filecoin";
}

// Provider usage
const provider = Ganache.provider(startupOptions);
const result = await provider.send({
  jsonrpc: "2.0",
  id: "0",
  method: "Filecoin.Version",
  params: []
});

// Server usage (starts up a HTTP and WebSocket server)
const server = Ganache.server(startupOptions);
server.listen(7777, () => {
  console.log("Lotus RPC endpoint listening at http://localhost:7777/rpc/v0");
});
```

## Startup Options

See available startup options [in `@ganache/filecoin-options`](../options/README.md).

## Supported RPC Methods

`@ganache/filecoin` does not support all of the RPC methods implemented within Lotus; further, it implements some custom methods. Below is a list of each method.

### Ganache Specific RPC Methods

- `Ganache.MineTipset`: Manually mine a tipset immediately. Mines even if the miner is disabled. No parameters.
- `Ganache.EnableMiner`: Enables the miner. No parameters.
- `Ganache.DisableMiner`: Disables the miner. No parameters.
- `Ganache.MinerEnabled`: The current status on whether or not the miner is enabled. The initial value is determined by the option `miner.mine`. If true, then auto-mining (`miner.blockTime = 0`) and interval mining (`miner.blockTime > 0`) will be processed. If false, tipsets/blocks will only be mined with `Ganache.MineTipset`. No parameters.
- `Ganache.MinerEnabledNotify`: A subscription method that provides an update whenever the miner is enabled or disabled. No parameters.
- `Ganache.GetDealById`: Retrieves an internal `DealInfo` by its `DealID`. Takes a single parameter, `DealID`, of type `number`.

### Supported Lotus RPC methods

- `Filecoin.ChainGetBlock`
- `Filecoin.ChainGetBlockMessages`
- `Filecoin.ChainGetGenesis`
- `Filecoin.ChainGetMessage`
- `Filecoin.ChainGetTipSet`
- `Filecoin.ChainGetTipSetByHeight`
- `Filecoin.ChainHead`
- `Filecoin.ChainNotify`
- `Filecoin.ClientFindData`
- `Filecoin.ClientGetDealInfo`
- `Filecoin.ClientGetDealStatus`
- `Filecoin.ClientGetDealUpdates`
- `Filecoin.ClientListDeals`
- `Filecoin.ClientRetrieve`
- `Filecoin.ClientStartDeal`
- `Filecoin.ID` - Returns a hardcoded ID of `bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg`
- `Filecoin.MpoolBatchPush` - FIL transfer only (`Method = 0`)
- `Filecoin.MpoolBatchPushMessage` - FIL transfer only (`Method = 0`)
- `Filecoin.MpoolClear`
- `Filecoin.MpoolGetNonce`
- `Filecoin.MpoolPending`
- `Filecoin.MpoolPush` - FIL transfer only (`Method = 0`)
- `Filecoin.MpoolPushMessage` - FIL transfer only (`Method = 0`)
- `Filecoin.MpoolSelect`
- `Filecoin.StateListMiners`
- `Filecoin.StateMinerInfo`
- `Filecoin.StateMinerPower`
- `Filecoin.WalletBalance`
- `Filecoin.WalletDefaultAddress`
- `Filecoin.WalletDelete`
- `Filecoin.WalletExport`
- `Filecoin.WalletHas`
- `Filecoin.WalletImport` - `KeyInfo.Type` of type `secpk1-ledger` is not supported
- `Filecoin.WalletList`
- `Filecoin.WalletNew` - `KeyInfo.Type` of type `secpk1-ledger` is not supported
- `Filecoin.WalletSetDefault`
- `Filecoin.WalletSign`
- `Filecoin.WalletSignMessage`
- `Filecoin.WalletValidateAddress`
- `Filecoin.WalletVerify`
- `Filecoin.ActorAddress`
- `Filecoin.Version`
