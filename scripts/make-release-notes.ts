import * as readline from "readline";
import { TruffleColors } from "../src/packages/colors";
import yargs from "yargs";
import { execSync } from "child_process";
import { exit } from "process";
import {
  getBackToLink,
  getChangelogHead,
  getCommitsMd,
  getFuturePlansHead,
  getIssueGroupMarkdown,
  getKnownIssuesHead,
  getIssueSectionMarkdown,
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

const COMMAND_NAME = "make-release-notes";

const COLORS = {
  Bold: "\x1b[1m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m"
};

const issueSection = [
  {
    pretty: "Known Issues",
    url: "known-issues",
    groups: [
      {
        name: "Top Priority",
        milestones: ["7.0.x"],
        labels: ["bug"]
      },
      {
        name: "Coming Soon™",
        milestones: ["7.1.0", "8.0.0"],
        labels: ["bug"]
      }
    ]
  },
  {
    pretty: "Future Plans",
    url: "future-plans",
    groups: [
      {
        name: "Top Priority",
        milestones: ["7.0.x"],
        labels: ["enhancement"]
      },
      {
        name: "Coming Soon™",
        milestones: ["7.1.0", "8.0.0"],
        labels: ["enhancement"]
      }
    ]
  }
];

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
  .command(`${COMMAND_NAME}`, "", yargs => {
    yargs
      .option("releaseVersion", {
        default: "TEST_VERSION",
        require: false
      })
      .option("branch", {
        default: function getCurrentBranch() {
          return execSync("git rev-parse --abbrev-ref HEAD", {
            encoding: "utf8"
          }).trim();
        },
        require: false
      });
    return yargs.usage(
      chalk`{hex("${TruffleColors.porsche}").bold Create a release markdown template}`
    );
  })
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
  type Section = { type: Type; subject: string; pr: string };
  const types = Object.keys(details) as Type[];

  const version = argv.releaseVersion as string;
  const branch = argv.branch as string;

  if (!validReleaseBranches.includes(branch))
    throw new Error(
      `You must be on a valid branch (${validReleaseBranches.join(", ")})`
    );

  const output = execSync(`git log "${branch}"..develop --pretty=format:%s`, {
    encoding: "utf8"
  });

  const metrics = getCommitMetrics(branch);

  const commits = output.split("\n").reverse();
  metrics.commitCount = commits.length;

  async function parse() {
    const sections: Map<keyof typeof details, Section[]> = new Map();
    const commitData = [];
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      let [_, _type, scope, comment, pr] = commit.split(
        /^([a-z]+)(\(.+\))?:(.*?)(?:\(#(\d.+)\))?$/i
      );
      const type = (_type ? _type.trim().toLowerCase() : undefined) as Type;

      if (types.includes(type)) {
        const { slug } = details[type as Type];

        let author = "";
        if (pr) {
          const ghData = execSync(`gh pr --info ${pr}`, { encoding: "utf8" });
          const maybeAuthor = ghData.match(/@[a-z\d-]*(?!(.*:.*)@[a-z\d-])/i);
          if (maybeAuthor) {
            author = maybeAuthor[0];
          }
        }

        const scopeMd = scope ? `${scope}` : "";
        const prMd = pr ? `(#${pr})` : "";
        const subjectSansPr = `${type}${scopeMd}: ${comment.trim()}`;
        const subject = `${subjectSansPr} ${prMd}`;

        const section: Section[] = sections.get(slug as Type) || [];
        if (pr && author) {
          commitData.push({ subject: subjectSansPr, pr, author });
        }
        section.push({ type, subject, pr });
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
    return { sections: ordered, commits: commitData };
  }

  try {
    const { sections, commits } = await parse();

    const sectionTableContents: string[] = [];
    const sectionMarkdown: string[] = [];
    const changelogMarkdown: string[] = [];
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

    // make changelog
    for (const commit of commits) {
      changelogMarkdown.push(
        ` - #${commit.pr} ${commit.subject} (${commit.author})`
      );
    }
    sectionMarkdown.push(
      getSectionMd(version, "changelog", "Changelog", changelogMarkdown)
    );

    sectionTableContents.push(getChangelogHead(version));

    // make known issues and future plans
    for (const section of issueSection) {
      const issueSectionMarkdown: string[] = [];
      let hasMatch = true;
      for (const group of section.groups) {
        let matches: RegExpMatchArray[] = [];
        for (const ms of group.milestones) {
          for (const lbl of group.labels) {
            const ghData = execSync(
              `gh is --list --milestone ${ms} --labels ${lbl}`,
              { encoding: "utf8" }
            );
            // TODO: The issue list we get from gh is all sorts of messed up. Maybe we can fix what they out-
            // put to us so we don't need this hideous (and probably fragile) regex. In the meantime:
            //   (?<=[\n\r]).*      => This ignores the first line
            //   (?:\[\d*m)        => Ignore the junk characters they give us
            //   #(\d+)             => Find and capture the issue number
            //   (?:\[\d*m)        => Ignore some more junk
            //   (.*)(?=\s\[\d*m@) => Get characters up until more junk. Call this our subject
            matches.push(
              ...ghData.matchAll(
                /(?<=[\n\r]).*(?:\[\d*m#)(\d+)(?:\[\d*m\s)(.*)(?=\s\[\d*m@)/g
              )
            );
          }
        }
        if (matches.length === 0) {
          hasMatch = false;
        } else {
          if (hasMatch) {
            issueSectionMarkdown.push(getIssueGroupMarkdown(group.name));
          }
          for (const match of matches) {
            const [_, issueNumber, subject] = match;
            issueSectionMarkdown.push(
              getIssueSectionMarkdown(subject, issueNumber)
            );
          }
        }
      }
      sectionMarkdown.push(
        getSectionMd(version, section.url, section.pretty, issueSectionMarkdown)
      );
    }

    sectionTableContents.push(getKnownIssuesHead(version));

    // make future plans
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
