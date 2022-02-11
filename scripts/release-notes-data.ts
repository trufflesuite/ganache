export function getSectionTableContent(
  version: string,
  url: string,
  pretty: string
) {
  return `		<code>&nbsp;<a href="#user-content-${version}-${url}">${pretty.replace(
    / /g,
    "&nbsp;"
  )}</a>&nbsp;</code>
<img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`;
}

export function getTocMd(
  subject: string,
  version: string,
  url: string,
  i: number
) {
  return `- [${subject}](#user-content-${version}-${url}-${i})`;
}

export function getBackToLink(version: string, url: string, pretty: string) {
  return `\n<p align="right"><sup><a href="#user-content-${version}-${url}">back to ${pretty.toLowerCase()}</a></sup></p>`;
}

export function getCommitsMd(
  subject: string,
  version: string,
  url: string,
  i: number
) {
  return `
### <a id="user-content-${version}-${url}-${i}"></a>${subject}

DESCRIPTION
`;
}

export function getSectionMd(
  version: string,
  url: string,
  pretty: string,
  commitsMarkdown: string[],
  tocMarkdown: string[] = []
) {
  return `
<a id="user-content-${version}-${url}" ></a>

---

# <p align="center"><a href="#user-content-${version}-${url}"><img alt="${pretty}" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/title-images/${url}.svg"></a></p>

${tocMarkdown.length ? tocMarkdown.join("\n") + "\n\n---\n\n" : ""}

${commitsMarkdown.join("\n")}

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>
        
`;
}

export function getKnownIssuesHead(version: string) {
  return `		<code>&nbsp;<a href="#user-content-${version}-known-issues">Known&nbsp;Issues</a>&nbsp;</code>
  <img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`;
}

export function getFuturePlansHead(version: string) {
  return `		<code>&nbsp;<a href="#user-content-${version}-future-plans">Future&nbsp;Plans</a>&nbsp;</code>
  <img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`;
}

export function getMdBody(
  version: string,
  sectionTableContents: string[],
  metrics: {
    commitCount: number;
    additionCount: number;
    deletionCount: number;
    fileCount: number;
  },
  sectionMarkdown: string[]
) {
  return `<a id="user-content-${version}-top"></a>
<h4>
  <p align="center">
${sectionTableContents.join("\n")}
  </p>
</h4>

---

PREAMBLE

To install globally run:

\`\`\`bash
npm uninstall ganache-cli --global
npm install ganache@beta --global
\`\`\`

<a id="user-content-${version}-highlights"></a>

---

# <p align="center"><a href="#user-content-${version}-highlights"><img alt="Highlights" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/title-images/highlights.svg"></a></p>

We've changed ${metrics.fileCount} files across ${
    metrics.commitCount
  } merged pull requests, tallying ${metrics.additionCount} additions and ${
    metrics.deletionCount
  } deletions, since our last release.

HIGHLIGHTS

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>

${sectionMarkdown.join("\n")}


<a id="user-content-${version}-known-issues"></a>

---

# <p align="center"><a href="#user-content-${version}-known-issues"><img alt="Known Issues" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/title-images/known-issues.svg"></a></p>

- \`evm_setAccountNonce\` is race-conditiony ([#1646](https://github.com/trufflesuite/ganache/issues/1646))
- \`--miner.callGasLimit\` implementation is wrong ([#1645](https://github.com/trufflesuite/ganache/issues/1645))
- We don't return a proper pending block ([#772](https://github.com/trufflesuite/ganache/issues/772))
- Forking doesn't work in the browser
- Uncles aren't fully supported when forking
- Forking may fail in weird and unexpected ways. We need to "error better" here
- Node.js v12 outputs a µWS warning in the console
- Node.js v12 doesn't handle memory as well as 14+ and may crash computing very large \`debug_traceTransaction\` results
- Our bundle size is larger than ideal

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>

<a id="user-content-${version}-future-plans"></a>

---

# <p align="center"><a href="#user-content-${version}-future-plans"><img alt="Future Plans" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/title-images/future-plans.svg"></a></p>

- Update the \`eth_maxPriorityFeePerGas\` RPC method to return as Geth does, \`eth_gasPrice - baseFeePerGas\`.
- Add support for the \`eth_feeHistory\` RPC method.
- Support for enabling eligible draft EIPs before they are finalized or considered for inclusion in a hardfork.
- New hardfork support well in advance of the hardfork launch.
- Add an \`eth_createAccessList\` method.
- Track test performance metrics over time.
- Track real world Ganache usage (opt-in and anonymized) to better tune performance and drive bug fixes and feature development.
- Track test coverage.
- Document how to use Ganache in the browser, and what limits it has.
- \`evm_mine\` will return the new blocks instead of just \`0x0\`.
- We've laid the groundwork for additional performance improvements. We expect to see an additional 2-5x speed up for typical testing work loads in the near future.
- Add new \`evm_setCode\` and \`evm_setStorageAt\` RPC methods.
- Make \`evm_snapshot\` ids globally unique (unpredictable instead of a counter).
- Support \`eth_getRawTransactionByHash\` RPC method.
- Support \`debug_accountAt\` RPC method.
- Allow "mining" to be disabled on start up.
- Set CLI options via config file, package.json, or ENV vars.
- "Flavor" Plugins: We're building support for Layer 2 plugins into Ganache so we can start up and manage other chains. e.g., The \`ganache filecoin\` command will look for the \`@ganache/filecoin\` package and start up a Filecoin and IPFS server.
- Multi-chain configurations: you'll be able to start up your project's entire blockchain "ecosystem" from a single ganache command: e.g., \`ganache --flavor ethereum --flavor filecoin --flavor optimism\`.
  - this is where defining your CLI options via JSON config will come in very handy!
- Create a CLI interactive/RELP mode.
- Enable a CLI daemon mode.

[Open new issues](https://github.com/trufflesuite/ganache/issues/new?milestone=7.0.0) (or [join our team](https://consensys.net/open-roles/?discipline=32535/)) to influence what we gets implemented and prioritized.

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>

---

<p align="center">
  💖 The Truffle Team
</p>
`;
}
