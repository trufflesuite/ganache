import * as readline from "readline";
import { TruffleColors } from "../src/packages/colors/typings";
import yargs from "yargs";
import { execSync } from "child_process";
import { exit } from "process";
import {
  getBackToLink,
  getCommitsMd,
  getFuturePlansHead,
  getKnownIssuesHead,
  getMdBody,
  getSectionMd,
  getSectionTableContent,
  getTocMd
} from "./release-notes-data";

const chalk = require("chalk");

const validReleaseBranches = [
  "beta",
  "alpha",
  "rc",
  "develop",
  "master",
  "release-notes-automation"
];

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
    return yargs.usage(
      chalk`{hex("${TruffleColors.porsche}").bold Create a release markdown template}`
    );
  })
  .demandCommand()
  .version(false)
  .help(false)
  .fail((msg, err, yargs) => {
    // we use a custom `fail` fn so that NPM doesn't print its own giant error message.
    if (err) throw err;

    console.error(yargs.help().toString().replace("\n\n\n", "\n"));
    console.error();
    console.error(msg);
    process.exit(0);
  }).argv;

process.stdout.write(`${COLORS.Reset}`);

const getCommitMetrics = (branch: string) => {
  const numStat = execSync(`git diff "${branch}"..develop --numstat`, {
    encoding: "utf8"
  }).split("\n");
  const files = new Set();
  const metrics = {
    commitCount: 0,
    additionCount: 0,
    deletionCount: 0,
    fileCount: 0
  };
  numStat.forEach(line => {
    if (!line) return;
    const [added, deleted, file] = line.split(/\t/g);
    metrics.additionCount += parseInt(added, 10);
    metrics.deletionCount += parseInt(deleted, 10);
    files.add(file);
  });
  metrics.fileCount = files.size;
  return metrics;
};

(async function () {
  const misc = { slug: "build", pretty: "Miscellaneous", url: "miscellaneous" };
  const details = {
    breaking: {
      slug: "breaking",
      pretty: "Breaking Changes",
      url: "breaking-changes"
    },
    feat: { slug: "feat", pretty: "New Features", url: "new-features" },
    fix: { slug: "fix", pretty: "Fixes", url: "fixes" },
    build: misc,
    chore: misc,
    ci: misc,
    docs: misc,
    style: misc,
    refactor: misc,
    perf: misc,
    test: misc
  } as const;
  type Type = keyof typeof details;
  type Section = { type: Type; subject: string };
  const types = Object.keys(details) as Type[];

  const version = argv.version as string;

  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8"
  }).trim();
  if (!validReleaseBranches.includes(currentBranch))
    throw new Error(
      `You must be on a valid branch (${validReleaseBranches.join(", ")})`
    );

  const output = execSync(
    `git log "${currentBranch}"..develop --pretty=format:%s`,
    { encoding: "utf8" }
  );

  const metrics = getCommitMetrics(currentBranch);

  const commits = output.split("\n").reverse();
  metrics.commitCount = commits.length;

  async function parse() {
    const sections: Map<keyof typeof details, Section[]> = new Map();
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      let [_, _type, scope, comment, pr] = commit.split(
        /^([a-z]+)(\(.+\))?:(.*?)(?:\(#(\d.+)\))?$/i
      );
      const type = (_type ? _type.trim().toLowerCase() : undefined) as Type;
      if (types.includes(type)) {
        const { slug } = details[type as Type];

        const scopeMd = scope ? `(${scope})` : "";
        const subject = `${type}${scopeMd}: ${comment.trim()}`;

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
          const answer = (await question(
            "No matching semantic type for commit:\n" +
              commit +
              "\n\nIgnore commit? (I) or (C)ancel?\n"
          )) as any;
          rl.close();
          if (answer.toLowerCase() === "i") {
            console.log("ignoring commit");
            break;
          } else if (answer.toLowerCase() === "c") {
            throw new Error("User cancelled");
          }
        }
      }
    }
    const ordered: Map<Type, Section[]> = new Map();
    for (const type of types) {
      if (sections.has(type)) {
        ordered.set(type, sections.get(type)!);
      }
    }
    return ordered;
  }

  try {
    const sections = await parse();

    const sectionTableContents: string[] = [];
    const sectionMarkdown: string[] = [];
    for (const [slug, section] of sections) {
      const typeDeets = details[slug];
      const url = typeDeets.url;
      const pretty = typeDeets.pretty;

      sectionTableContents.push(getSectionTableContent(version, url, pretty));

      const tocMarkdown: string[] = [];
      const commitsMarkdown: string[] = [];
      const printToc = section.length > 1;
      section.forEach(({ subject }, i) => {
        if (printToc) {
          tocMarkdown.push(getTocMd(subject, version, url, i));
        }
        const backToLink = printToc ? getBackToLink(version, url, pretty) : "";
        commitsMarkdown.push(
          getCommitsMd(subject, version, url, i) + backToLink
        );
      });

      sectionMarkdown.push(
        getSectionMd(version, url, pretty, commitsMarkdown, tocMarkdown)
      );
    }

    sectionTableContents.push(getKnownIssuesHead(version));
    sectionTableContents.push(getFuturePlansHead(version));

    let markdown = getMdBody(
      version,
      sectionTableContents,
      metrics,
      sectionMarkdown
    );

    require("fs").writeFileSync("my-draft.md", markdown, { encoding: "utf8" });
  } catch (e) {
    console.error(e);
    exit(1);
  }
})();
