import * as readline from 'readline';
import { TruffleColors } from "../src/packages/colors/typings";
import yargs from "yargs";
import { execSync } from "child_process";
import { exit } from 'process';

const chalk = require("chalk");

const validReleaseBranches = ["beta", "alpha", "rc", "develop", "master"];

const COMMAND_NAME = "make-release";

const COLORS = {
  Bold: "\x1b[1m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m"
};

const getArgv = () => {
  const npmConfigArgv = process.env["npm_config_argv"];
  if (npmConfigArgv) {
    // handle `npm run make-release version`
    // convert original npm args into a command
    // make-release <version>
    return JSON.parse(npmConfigArgv).original.slice(1);
  } else {
    // handle `ts-node ./scripts/make-release.ts version`
    const args = [...process.argv].slice(2);
    args.unshift(COMMAND_NAME);
    return args;
  }
};

const argv = yargs(getArgv())
  .command(`${COMMAND_NAME} <version>`, "", yargs => {
    return yargs
      .usage(
        chalk`{hex("${TruffleColors.porsche}").bold Create a release markdown template}`
      )
  }).demandCommand()
  .version(false)
  .help(false).fail((msg, err, yargs) => {
    // we use a custom `fail` fn so that NPM doesn't print its own giant error message.
    if (err) throw err;

    console.error(yargs.help().toString().replace("\n\n\n", "\n"));
    console.error();
    console.error(msg);
    process.exit(0);
  }).argv;
process.stdout.write(`${COLORS.Reset}`);


(async function () {
  const misc = { slug: "build", pretty: "Miscellaneous", url: "miscellaneous" };
  const details = {
    "breaking": { slug: "breaking", pretty: "Breaking Changes", url: "breaking-changes" },
    "feat": { slug: "feat", pretty: "New Features", url: "new-features" },
    "fix": { slug: "fix", pretty: "Fixes", url: "fixes" },
    "build": misc,
    "chore": misc,
    "ci": misc,
    "docs": misc,
    "style": misc,
    "refactor": misc,
    "perf": misc,
    "test": misc
  } as const;
  type Type = keyof typeof details;
  type Section = { type: Type, subject: string };
  const types = Object.keys(details) as (Type)[];

  const { version } = argv;

  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  if (!validReleaseBranches.includes(currentBranch)) throw new Error(`You must be on a valid branch (${validReleaseBranches.join(", ")})`);

  const numStat = execSync(`git diff "${currentBranch}"..develop --numstat`, { encoding: "utf8" }).split("\n");
  const files = new Set();
  let additionCount = 0;
  let deletionCount = 0;
  numStat.forEach(line => {
    if (!line) return;
    const [added, deleted, file] = line.split(/\t/g);
    additionCount += parseInt(added, 10);
    deletionCount += parseInt(deleted, 10);
    files.add(file);
  })
  const fileCount = files.size;

  const output = execSync(`git log "${currentBranch}"..develop --pretty=format:%s`, { encoding: "utf8" });
  const commits = output.split("\n").reverse();

  async function parse() {
    const sections: Map<keyof typeof details, Section[]> = new Map();
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      let [_, _type, scope, comment] = commit.split(/^([a-z]+)(\(.+\))?:(.*)$/i);
      const type = (_type ? _type.trim().toLowerCase() : undefined) as Type;
      if (types.includes(type)) {
        const { slug } = details[type as Type];
        const subject = `${type}${scope ? `(${scope})` : ''}: ${comment.trim()}`;
        const section: Section[] = sections.get(slug as Type) || [];
        section.push({ type: type, subject });
        sections.set(slug as Type, section);
      } else {
        while (true) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          const question = (q: string) => {
            return new Promise(resolve => {
              rl.question(q, resolve);
            });
          };
          const answer = await question("No matching semantic type for commit:\n" + commit + "\n\nIgnore commit? (I) or (C)ancel?\n") as any;
          rl.close();
          if (answer === "I") {
            console.log("ignoring commit");
            break;
          } else if (answer === "C") {
            throw new Error("User cancelled");
          }
        }
      }
    };
    const ordered: Map<Type, Section[]> = new Map();
    for (const type of types) {
      if (sections.has(type)) {
        ordered.set(type, sections.get(type)!);
      }
    }
    return ordered;
  };

  try {
    const sections = await parse();

    const sectionTableContents: string[] = [];
    const sectionMardown: string[] = [];
    for (const [slug, section] of sections) {
      const typeDeets = details[slug];

      sectionTableContents.push(`		<code>&nbsp;<a href="#user-content-${version}-${typeDeets.url}">${typeDeets.pretty.replace(/ /g, "&nbsp;")}</a>&nbsp;</code>
		<img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`);

      const contentsMarkdown: string[] = [];
      const commitsMarkdown: string[] = [];
      const printContentsMarkdown = section.length > 1;
      section.forEach(({ type, subject }, i) => {
        if (printContentsMarkdown) {
          contentsMarkdown.push(`- [${subject}](#user-content-${version}-${typeDeets.url}-${i})`);
        }
        const backToLink = printContentsMarkdown ? `\n<p align="right"><sup><a href="#user-content-${version}-${typeDeets.url}">back to ${typeDeets.pretty.toLowerCase()}</a></sup></p>` : ""
        commitsMarkdown.push(`
### <a id="user-content-${version}-${typeDeets.url}-${i}"></a>${subject}

DESCRIPTION
${backToLink}`
        );
      });

      sectionMardown.push(`
<a id="user-content-${version}-${typeDeets.url}" ></a>

---

# <p align="center"><a href="#user-content-${version}-${typeDeets.url}"><img alt="${typeDeets.pretty}" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/title-images/${typeDeets.url}.svg"></a></p>

${printContentsMarkdown ? contentsMarkdown.join("\n") + "\n\n---\n\n" : ""}

${commitsMarkdown.join("\n")}

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>
        
`);

    }

    sectionTableContents.push(`		<code>&nbsp;<a href="#user-content-${version}-known-issues">Known&nbsp;Issues</a>&nbsp;</code>
		<img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`);
    sectionTableContents.push(`		<code>&nbsp;<a href="#user-content-${version}-future-plans">Future&nbsp;Plans</a>&nbsp;</code>
		<img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`);

    let markdown = `<a id="user-content-${version}-top"></a>
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

We've changed ${fileCount} files across ${commits.length} merged pull requests, tallying ${additionCount} additions and ${deletionCount} deletions, since our last release.

HIGHLIGHTS

<p align="right"><sup><a href="#user-content-${version}-top">back to top</a></sup></p>

${sectionMardown.join("\n")}


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

    require("fs").writeFileSync("my-draft.md", markdown, { encoding: "utf8" });

  } catch (e) {
    console.error(e);
    exit(1);
  }
})();