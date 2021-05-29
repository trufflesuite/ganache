<!-- Using h2 instead of h1 because npm doesn't support align=center on h1 tags -->
<h2 align="center">
  <a href="#readme" title="Ganache README.md"><img alt="Ganache" src="https://trufflesuite.github.io/ganache-core/assets/img/ganache-logo-dark.svg" alt="Ganache" width="160"/></a>
</h2>

<h3 align="center">
  A tool for creating a local blockchain for fast Ethereum development.
</h3>

<p align="center">
  <a title="ganache on npm" href="https://www.npmjs.com/ganache"><img alt="" src="https://img.shields.io/npm/v/ganache?label=npm&amp;color=b98b5b&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbD0iIzMzMjUyYSIgZD0iTTcgN2gyNnYyNmgtN1YxNGgtNnYxOUg3eiIvPjwvc3ZnPgo=" /></a>
  <a href="https://www.trufflesuite.com/dashboard" title="Trufflesuite download dashboard"><img alt="" src="https://img.shields.io/npm/dm/ganache?color=b98b5b&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTAuMzEgMjE0Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2U0YTY2Mzt9LmNscy0ye2ZpbGw6IzVlNDY0ZDt9LmNscy0ze2ZpbGw6I2ZmZjt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmdhbmFjaGUtbG9nb21hcms8L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl84IiBkYXRhLW5hbWU9IkxheWVyIDgiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2NS4zOCwxNjAuMzFjMi4yNCwwLDMtLjUyLDQuMDYtMi4zM3MuNTUtNC43NS41MS01LjU1Yy0uMS0xLjc2LS42OS0zLjcyLS43Ni00LjctLjA1LS42LDAtNC40My4wOS02LDEuMzQtMjQuODQsMTItMzAuNzUsMTUuMDctMzEuNDJhOC41OSw4LjU5LDAsMCwxLDUuOTQuNGwwLTM4aDBsMC0uNTRWNjIuMDljMC01LjQ5LTMuOTEtMTIuMjQtOC42Ni0xNWwtNzcuODctNDVDOTktLjY5LDkxLjE5LS42OSw4Ni40MywyLjA2TDguNjUsNDdDMy44OSw0OS43MSwwLDU2LjQ2LDAsNjJ2OS44MnMwLC4xMSwwLC4xN1Y4Ni4zM2MuNDUuMjUuOTEuNTEsMS4zNi43OSwxLjUsMSwzLDEuNTUsNC41MSwyLjZhNjguNDMsNjguNDMsMCwwLDEsMTIsOS4yOGMuNy42OCwzLjA3LDMuNjYsMy42NCw0LjM2YTQ3LjIyLDQ3LjIyLDAsMCwwLDUuNzcsNi42LDIwLjYyLDIwLjYyLDAsMCwwLDMuODcsMi43OGMyLjI4LDEuMTksNi4wNy45Miw4LC4wNywxNC44Mi02LjQyLDI0LjEyLTMuMiwyOC40MS0uNjIsMTAuNjEsNi4zNywxNC4xNSwxNS4yOCwxNS4yOCwyNi4xYTI5LjIyLDI5LjIyLDAsMCwxLC4xNCw0LjIyYzAsMi41Ny0uMDksNi43LDIuNjIsNy4zOSwzLjg5LDEsNC44My0zLjE2LDUuNDEtNS45MiwxLjMyLTYuMjUsOS42My0xMC4zNSwxNS43Mi03LjIsNC4yLDIuMTcsNS45MiwzLjQsMTAuMDcsMS41Nyw1LjItMi4yOSw3Ljg3LTguMTIsOS42OC0xMS4yMkExOSwxOSwwLDAsMSwxMzQsMTIwYzguMTEtNS4wNSwyOC40Ni0zLjc0LDI5LjIxLDE4LjcsMCwxLjIyLDAsNC4zNCwwLDYuMjQsMCwyLjE0LjA3LDQuMjMtLjA3LDYuNDQtLjA4LDEuNDctLjM1LDMtLjQ5LDQuNTFDMTYyLjU1LDE1NS45LDE2MS43OSwxNjAuMjksMTY1LjM4LDE2MC4zMVoiLz48cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0xOTAuMjgsMTEwLjc1Yy0uNTYtLjE3LTIuMTYtMS4yMi01LjkzLS40LTMuMDkuNjctMTMuNzMsNi41OC0xNS4wNywzMS40Mi0uMDgsMS41My0uMTQsNS4zNi0uMDksNiwuMDcsMSwuNjYsMi45NC43Niw0LjcsMCwuOC42MiwzLjctLjUxLDUuNTVzLTEuODIsMi4zNC00LjA2LDIuMzNjLTMuNTksMC0yLjgzLTQuNDEtMi44My00LjQxLjE0LTEuNDkuNDEtMywuNDktNC41MS4xNC0yLjIxLjA3LTQuMy4wNy02LjQ0LDAtMS45LDAtNSwwLTYuMjRDMTYyLjQxLDExNi4yNywxNDIuMDYsMTE1LDEzNCwxMjBhMTksMTksMCwwLDAtNy40OCw3LjEyYy0xLjgxLDMuMS00LjQ4LDguOTMtOS42OCwxMS4yMi00LjE1LDEuODMtNS44Ny42LTEwLjA3LTEuNTctNi4wOS0zLjE1LTE0LjQuOTUtMTUuNzIsNy4yLS41OCwyLjc2LTEuNTIsNi45MS01LjQxLDUuOTItMi43MS0uNjktMi42Mi00LjgyLTIuNjItNy4zOWEyOS4yMiwyOS4yMiwwLDAsMC0uMTQtNC4yMmMtMS4xMy0xMC44Mi00LjY3LTE5LjczLTE1LjI4LTI2LjEtNC4yOS0yLjU4LTEzLjU5LTUuOC0yOC40MS42Mi0yLC44NS01Ljc0LDEuMTItOC0uMDdBMjAuNjIsMjAuNjIsMCwwLDEsMjcuMjUsMTEwYTQ3LjIyLDQ3LjIyLDAsMCwxLTUuNzctNi42Yy0uNTctLjctMi45NC0zLjY4LTMuNjQtNC4zNmE2OC40Myw2OC40MywwLDAsMC0xMi05LjI4Yy0xLjUyLTEtMy0xLjY0LTQuNTEtMi42LS40NS0uMjgtLjkxLS41NC0xLjM2LS43OWwwLDY1LjU3YzAsNS41LDMuOSwxMi4yNSw4LjY2LDE1bDc3Ljg2LDQ1YzQuNzYsMi43NiwxMi41NSwyLjc2LDE3LjMxLDBMMTgxLjY2LDE2N2M0Ljc2LTIuNzUsOC42NS05LjUsOC42NS0xNVoiLz48cGF0aCBjbGFzcz0iY2xzLTMiIGQ9Ik0xMDUsOTkuNzNjLTUuMzksMy4xMS0xNC4yLDMuMTEtMTkuNTgsMGwtNzkuNjEtNDJjLjkuODksODAuNzMsNDcuMjcsODAuNzMsNDcuMjcsNC43NiwyLjc2LDEyLjU1LDIuNzYsMTcuMzEsMCwwLDAsNzkuNzQtNDYuMjQsODAuNjMtNDcuMTNaIi8+PHBhdGggY2xhc3M9ImNscy0zIiBkPSJNODUuMzIsOC4wOEM5MC43MSw1LDk5LjUyLDUsMTA0LjksOC4wOWw5LjY1LDRjLS45LS44OS0xMC43OC03LjI5LTEwLjc4LTcuMjktNC43NS0yLjc1LTEyLjU0LTIuNzYtMTcuMywwLDAsMC0xNS43Nyw5LjI3LTE2LjY3LDEwLjE1WiIvPjwvZz48L2c+PC9zdmc+" /></a>
  <a title="Build status" href="https://github.com/trufflesuite/ganache-core/actions?query=workflow%3ACommits+branch%3Adevelop+event%3Apush"><img alt="" src="https://img.shields.io/github/workflow/status/trufflesuite/ganache-core/Commits/develop?event=push&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=github&amp;color=b98b5b"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#community">Community</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#related">Related</a>
</p>

---

## Features

Ganache is an Ethereum simulator that makes developing Ethereum applications faster, easier, and safer. It includes all popular RPC functions and features (like events) and can be run deterministically to make development a breeze.

- Fork any Ethereum network without waiting to sync
- Ethereum json-rpc support
- Snapshot/revert state
- Mine blocks instantly, on demand, or at an interval
- Fast-forward time
- Impersonate any account (no private keys required!)
- Listens for JSON-RPC 2.0 requests over HTTP/WebSockets
- Programmatic use in Node.js
- Pending Transactions

## Getting Started

Ganache can be used from the [command line](#command-line-use) or [programmatically](#programmatic-use) via Node.js.

### Command line use

You must first install [Node.js](https://nodejs.org/) >= v10.13.0 and npm >= 6.4.1.

To install ganache globally, run:

```console
$ npm install ganache --global
```

Once installed globally, you can start ganache right from your command line:

```console
$ ganache
Ganache CLI v6.12.1 (ganache-core: 2.13.1)

Available Accounts
==================
(0) 0xe261e26aECcE52b3788Fac9625896FFbc6bb4424 (100 ETH)
(1) 0xcE16e8eb8F4BF2E65BA9536C07E305b912BAFaCF (100 ETH)
(2) 0x02f1c4C93AFEd946Cce5Ad7D34354A150bEfCFcF (100 ETH)
(3) 0x0B75F0b70076Fab3F18F94700Ecaf3B00fE528E7 (100 ETH)
(4) 0x7194d1F1d43c2c58302BB61a224D41B649e65C93 (100 ETH)
(5) 0xC9A2d92c5913eDEAd9a7C936C96631F0F2241063 (100 ETH)
(6) 0xD79BcDE5Cb11cECD1dfC6685B65690bE5b6a611e (100 ETH)
(7) 0xb6D080353f40dEcA2E67108087c356d3A1AfcD64 (100 ETH)
(8) 0x31A064DeeaD74DE7B9453beB4F780416D8859d3b (100 ETH)
(9) 0x37524a360a40C682F201Fb011DB7bbC8c8A247c6 (100 ETH)

Private Keys
==================
(0) 0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6
(1) 0x6ec1f2e7d126a74a1d2ff9e1c5d90b92378c725e506651ff8bb8616a5c724628
(2) 0xb4d7f7e82f61d81c95985771b8abf518f9328d019c36849d4214b5f995d13814
(3) 0x941536648ac10d5734973e94df413c17809d6cc5e24cd11e947e685acfbd12ae
(4) 0x5829cf333ef66b6bdd34950f096cb24e06ef041c5f63e577b4f3362309125863
(5) 0x8fc4bffe2b40b2b7db7fd937736c4575a0925511d7a0a2dfc3274e8c17b41d20
(6) 0xb6c10e2baaeba1fa4a8b73644db4f28f4bf0912cceb6e8959f73bb423c33bd84
(7) 0xfe8875acb38f684b2025d5472445b8e4745705a9e7adc9b0485a05df790df700
(8) 0xbdc6e0a69f2921a78e9af930111334a41d3fab44653c8de0775572c526feea2d
(9) 0x3e215c3d2a59626a669ed04ec1700f36c05c9b216e592f58bbfd3d8aa6ea25f9

HD Wallet
==================
Mnemonic:      candy maple velvet cake sugar cream honey rich smooth crumble sweet treat
Base HD Path:  m/44'/60'/0'/0/{account_index}

Gas Price
==================
20000000000

Gas Limit
==================
6721975

Call Gas Limit
==================
9007199254740991

Listening on 127.0.0.1:8545
```

To install Ganache into an npm project, run:

```console
$ npm install ganache
```

You can then add ganache to your package.json scripts:

```json
"scripts": {
  "ganache": "ganache --wallet.seed myCustomSeed"
}
```

_See [Documentation](#documentation) for additional command line options._

Then start it:

```console
$ npm run ganache
```

### Programmatic use

You can use Ganache programmatically from Node.js. Install Ganache into your npm package:

```console
$ npm install ganache
```

Then you can use ganache as an [EIP-1193 provider only](#as-an-eip-1193-provider-only), an [EIP-1193 provider and JSON-RPC web server](#as-an-eip-1193-provider-and-json-rpc-web-server), as a [Web3 provider](#as-a-web3js-provider), or an [ethers provider](#as-an-ethersjs-provider).

#### As an EIP-1193 provider only:

```javascript
const ganache = require("ganache");

const options = {};
const provider = ganache.provider(options);
const accounts = await provider.request({ method: "eth_accounts", params: [] });
```

#### As an EIP-1193 provider and JSON-RPC web server:

```javascript
const ganache = require("ganache");

const options = {};
const server = ganache.server(options);
const PORT = 8545;
server.listen(PORT, err => {
  if (err) throw err;

  console.log(`ganache listening on port ${PORT}...`);
  const provider = server.provider;
  const accounts = await provider.request({ method: "eth_accounts", params:[] });
});
```

#### As a [web3.js](https://www.npmjs.com/package/web3) provider:

To use ganache as a Web3 provider:

```javascript
const Web3 = require("web3");
const ganache = require("ganache");

const web3 = new Web3(ganache.provider());
```

NOTE: depending on your web3 version, you may need to set a number of confirmation blocks

```
const web3 = new Web3(ganache.provider(), null, { transactionConfirmationBlocks: 1 });
```

#### As an [ethers.js]() provider:

```javascript
const ganache = require("ganache");

const provider = new ethers.providers.Web3Provider(ganache.provider());
```

## Documentation

New RPC documentation coming soon! See https://github.com/trufflesuite/ganache-core/tree/master#options for Ganache v2 documentation.

## Community

- [Discord](https://trfl.co/truffle-community)
- [Reddit](https://www.reddit.com/r/Truffle/)

## Contributing

See [CONTRIBUTING.md](https://github.com/trufflesuite/ganache-core/blob/develop/CONTRIBUTING.md) for our guide to contributing to Ganache.

## Related

- [Truffle](https://www.github.com/trufflesuite/truffle)
- [Drizzle](https://www.github.com/trufflesuite/drizzle)

<br/>

---

<h4 align="center">
  <a href="https://www.trufflesuite.com" title="Brought to you by Truffle"><img alt="Truffle" src="https://trufflesuite.github.io/ganache-core/assets/img/truffle-logo-dark.svg" width="60"/></a>
</h4>
