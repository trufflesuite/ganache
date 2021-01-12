<h1 align="center">
  <a href="#readme" title="Ganache README.md"><img alt="Ganache" src="./.github/ganache-logo-dark.svg" alt="Ganache" width="160"/></a>
</h1>

<h3 align="center">
  A tool for creating a local blockchain for fast Ethereum development.
</h3>

<p align="center">
  <a title="ganache-cli on npm" href="https://www.npmjs.com/ganache-cli"><img alt="" src="https://img.shields.io/npm/v/ganache-cli?label=npm&color=B98B5B&style=for-the-badge&labelColor=3c2c30&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbD0iIzMzMjUyYSIgZD0iTTcgN2gyNnYyNmgtN1YxNGgtNnYxOUg3eiIvPjwvc3ZnPgo=" /></a>
  <a href="https://www.trufflesuite.com/dashboard" title="Trufflesuite download dashbaord"><img alt="" src="https://img.shields.io/npm/dm/ganache-cli?color=B98B5B&style=for-the-badge&labelColor=3c2c30&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTAuMzEgMjE0Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2U0YTY2Mzt9LmNscy0ye2ZpbGw6IzVlNDY0ZDt9LmNscy0ze2ZpbGw6I2ZmZjt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmdhbmFjaGUtbG9nb21hcms8L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl84IiBkYXRhLW5hbWU9IkxheWVyIDgiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2NS4zOCwxNjAuMzFjMi4yNCwwLDMtLjUyLDQuMDYtMi4zM3MuNTUtNC43NS41MS01LjU1Yy0uMS0xLjc2LS42OS0zLjcyLS43Ni00LjctLjA1LS42LDAtNC40My4wOS02LDEuMzQtMjQuODQsMTItMzAuNzUsMTUuMDctMzEuNDJhOC41OSw4LjU5LDAsMCwxLDUuOTQuNGwwLTM4aDBsMC0uNTRWNjIuMDljMC01LjQ5LTMuOTEtMTIuMjQtOC42Ni0xNWwtNzcuODctNDVDOTktLjY5LDkxLjE5LS42OSw4Ni40MywyLjA2TDguNjUsNDdDMy44OSw0OS43MSwwLDU2LjQ2LDAsNjJ2OS44MnMwLC4xMSwwLC4xN1Y4Ni4zM2MuNDUuMjUuOTEuNTEsMS4zNi43OSwxLjUsMSwzLDEuNTUsNC41MSwyLjZhNjguNDMsNjguNDMsMCwwLDEsMTIsOS4yOGMuNy42OCwzLjA3LDMuNjYsMy42NCw0LjM2YTQ3LjIyLDQ3LjIyLDAsMCwwLDUuNzcsNi42LDIwLjYyLDIwLjYyLDAsMCwwLDMuODcsMi43OGMyLjI4LDEuMTksNi4wNy45Miw4LC4wNywxNC44Mi02LjQyLDI0LjEyLTMuMiwyOC40MS0uNjIsMTAuNjEsNi4zNywxNC4xNSwxNS4yOCwxNS4yOCwyNi4xYTI5LjIyLDI5LjIyLDAsMCwxLC4xNCw0LjIyYzAsMi41Ny0uMDksNi43LDIuNjIsNy4zOSwzLjg5LDEsNC44My0zLjE2LDUuNDEtNS45MiwxLjMyLTYuMjUsOS42My0xMC4zNSwxNS43Mi03LjIsNC4yLDIuMTcsNS45MiwzLjQsMTAuMDcsMS41Nyw1LjItMi4yOSw3Ljg3LTguMTIsOS42OC0xMS4yMkExOSwxOSwwLDAsMSwxMzQsMTIwYzguMTEtNS4wNSwyOC40Ni0zLjc0LDI5LjIxLDE4LjcsMCwxLjIyLDAsNC4zNCwwLDYuMjQsMCwyLjE0LjA3LDQuMjMtLjA3LDYuNDQtLjA4LDEuNDctLjM1LDMtLjQ5LDQuNTFDMTYyLjU1LDE1NS45LDE2MS43OSwxNjAuMjksMTY1LjM4LDE2MC4zMVoiLz48cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0xOTAuMjgsMTEwLjc1Yy0uNTYtLjE3LTIuMTYtMS4yMi01LjkzLS40LTMuMDkuNjctMTMuNzMsNi41OC0xNS4wNywzMS40Mi0uMDgsMS41My0uMTQsNS4zNi0uMDksNiwuMDcsMSwuNjYsMi45NC43Niw0LjcsMCwuOC42MiwzLjctLjUxLDUuNTVzLTEuODIsMi4zNC00LjA2LDIuMzNjLTMuNTksMC0yLjgzLTQuNDEtMi44My00LjQxLjE0LTEuNDkuNDEtMywuNDktNC41MS4xNC0yLjIxLjA3LTQuMy4wNy02LjQ0LDAtMS45LDAtNSwwLTYuMjRDMTYyLjQxLDExNi4yNywxNDIuMDYsMTE1LDEzNCwxMjBhMTksMTksMCwwLDAtNy40OCw3LjEyYy0xLjgxLDMuMS00LjQ4LDguOTMtOS42OCwxMS4yMi00LjE1LDEuODMtNS44Ny42LTEwLjA3LTEuNTctNi4wOS0zLjE1LTE0LjQuOTUtMTUuNzIsNy4yLS41OCwyLjc2LTEuNTIsNi45MS01LjQxLDUuOTItMi43MS0uNjktMi42Mi00LjgyLTIuNjItNy4zOWEyOS4yMiwyOS4yMiwwLDAsMC0uMTQtNC4yMmMtMS4xMy0xMC44Mi00LjY3LTE5LjczLTE1LjI4LTI2LjEtNC4yOS0yLjU4LTEzLjU5LTUuOC0yOC40MS42Mi0yLC44NS01Ljc0LDEuMTItOC0uMDdBMjAuNjIsMjAuNjIsMCwwLDEsMjcuMjUsMTEwYTQ3LjIyLDQ3LjIyLDAsMCwxLTUuNzctNi42Yy0uNTctLjctMi45NC0zLjY4LTMuNjQtNC4zNmE2OC40Myw2OC40MywwLDAsMC0xMi05LjI4Yy0xLjUyLTEtMy0xLjY0LTQuNTEtMi42LS40NS0uMjgtLjkxLS41NC0xLjM2LS43OWwwLDY1LjU3YzAsNS41LDMuOSwxMi4yNSw4LjY2LDE1bDc3Ljg2LDQ1YzQuNzYsMi43NiwxMi41NSwyLjc2LDE3LjMxLDBMMTgxLjY2LDE2N2M0Ljc2LTIuNzUsOC42NS05LjUsOC42NS0xNVoiLz48cGF0aCBjbGFzcz0iY2xzLTMiIGQ9Ik0xMDUsOTkuNzNjLTUuMzksMy4xMS0xNC4yLDMuMTEtMTkuNTgsMGwtNzkuNjEtNDJjLjkuODksODAuNzMsNDcuMjcsODAuNzMsNDcuMjcsNC43NiwyLjc2LDEyLjU1LDIuNzYsMTcuMzEsMCwwLDAsNzkuNzQtNDYuMjQsODAuNjMtNDcuMTNaIi8+PHBhdGggY2xhc3M9ImNscy0zIiBkPSJNODUuMzIsOC4wOEM5MC43MSw1LDk5LjUyLDUsMTA0LjksOC4wOWw5LjY1LDRjLS45LS44OS0xMC43OC03LjI5LTEwLjc4LTcuMjktNC43NS0yLjc1LTEyLjU0LTIuNzYtMTcuMywwLDAsMC0xNS43Nyw5LjI3LTE2LjY3LDEwLjE1WiIvPjwvZz48L2c+PC9zdmc+" /></a>
  <a title="CI status" href="https://github.com/trufflesuite/ganache-core/actions?query=workflow%3A%22CI%22"><img alt="" src="https://img.shields.io/github/workflow/status/trufflesuite/ganache-core/CI/ts?&style=for-the-badge&labelColor=3c2c30&logo=github&color=B98B5B"></a>
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

Ganache can be used from the command line or programmatically via Node.js.

### Command line use

You must first install [Node.js](https://nodejs.org/) >= v10.7.0 and npm >= 6.1.0.

To install ganache-cli globally, run:

```console
$ npm install ganache-cli --global
```

Once installed globally, you can start ganache-cli right from your command line:

```console
$ ganache-cli
Ganache CLI v6.12.1 (ganache-core: 2.13.1)

Available Accounts
==================
(0) 0x665a72A5A58c8ecD51dBC913f18286a104Ff6F8d (100 ETH)
(1) 0x990Ca50F8Ac586384594a98EDaB3F8b46CEd179c (100 ETH)
(2) 0x5c49b8831C81C4aa572d2733Ea7619e2fbaE7bb2 (100 ETH)
(3) 0xb3eFA990367077B0b74150B74E8D6520E692bD82 (100 ETH)
(4) 0xEb9D56915a83F7f2FEA6B18C702cD24D6a07fD62 (100 ETH)
(5) 0x8A199Adfd3D2fB10430f8D006cfd79b28D7D6562 (100 ETH)
(6) 0x2964eCA6615534E59b94FBf642d73Bcc09C7D835 (100 ETH)
(7) 0x255dE55cA7040D4ada06295F89Af5a3d7204f751 (100 ETH)
(8) 0x946790395bB4C0f6a6cEDD90D04D0023c3Bf256B (100 ETH)
(9) 0xddAeCA7f5d58539c9f78F64e8Be4bD437e6E085a (100 ETH)

Private Keys
==================
(0) 0x3b1f1c5750edbda54702bcd70d2f0925f38c77269d606bd0faad2369aa834770
(1) 0xdd09ee23ec00b5a6c24d954d9b333411c0ad830c1edc4dec0d625c532785e621
(2) 0x71edfcf731f142526f2a9adee826775b2ae512d7a65de7ae65fd074e0c7053a9
(3) 0x66ad9dd75f1fc73582a09c6da31ededec8df138db0acd02285792e9c29cd6711
(4) 0xa0a728215cbf24a62edfef3ecfdc5b137b18b4a07fa2502d4f21f705f898c5a4
(5) 0x9003b737d388eff793d308302c2e484f339c417e727e213cc46b7cd3f29dcef5
(6) 0xe8de8c5ee8643699f344cefb0c502e6081422fc012bd50274007dd167147a4e6
(7) 0xdf5df29263acd5b327db6870798856c2abab31262c83b5801ab4851297326266
(8) 0x2bb1e1a8372370ac758795c26a6cf1f015b89d05079a8750616cd1b61d93d3bb
(9) 0xbaa9325adb6a75b1177700130aed2281b1eb1fcfac5203c14a8cabf0f82e71d3

HD Wallet
==================
Mnemonic:      charge bamboo worry unaware rude drink congress mushroom exile federal typical couple
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

To install ganache-cli into an npm project, run:

```console
$ npm install ganache-cli
```

You can then add ganache-cli to your package.json scripts:

```json
"scripts": {
  "ganache": "ganache-cli --seed myCustomSeed"
}
```

_See [Documentation](#documentation) for additional command line options._

then start it:

```console
$ npm run ganache
```

### Programmatic use

You can use ganache-cli programmatically from Node.js. Install ganache-cli into your npm package:

```console
$ npm install ganache-cli
```

then start ganache as an EIP-1193 provider only:

```javascript
const ganache = require("ganache-cli");

const options = {};
const provider = ganache.provider(options);
const accounts = await provider.request({ method: "eth_accounts", params: [] });
```

or as an EIP-1193 provider _and_ JSON-RPC web server:

```javascript
const ganache = require("ganache-cli");

const options = {};
const server = ganache.server(options);
const PORT = 8545;
server.listen(PORT, err => {
  if (err) throw err;

  console.log(`ganache-cli listening on port ${PORT}...`);
  const provider = server.provider;
  const accounts = await provider.request({ method: "eth_accounts", params:[] });
});
```

#### As a [web3.js](https://www.npmjs.com/package/web3) Provider

To use ganache as a Web3 provider:

```javascript
const Web3 = require("web3");
const ganache = require("ganache-cli");

const web3 = new Web3(ganache.provider());
```

NOTE: depending on your web3 version, you may need to set a number of confirmation blocks

```
const web3 = new Web3(ganache.provider(), null, { transactionConfirmationBlocks: 1 });
```

#### As an [ethers.js]() provider:

```javascript
const ganache = require("ganache-cli");

const provider = new ethers.providers.Web3Provider(ganache.provider());
```

## Documentation

TODO

## Community

TODO

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for our guide to contributing to ganache.

## Related

- [Truffle](https://www.github.com/trufflesuite/truffle)
- [Drizzle](https://www.github.com/trufflesuite/drizzle)

<br/>

---

<h4 align="center">
  <a href="https://www.trufflesuite.com" title="Brought to you by truffle"><img alt="Truffle" src="./.github/truffle-logo-dark.svg" alt="drawing" width="60"/></a>
</h4>
