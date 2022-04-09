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
  i: number,
  body: string
) {
  return `
### <a id="user-content-${version}-${url}-${i}"></a>${subject}

${body}
`;
}

export function getIssueGroupMarkdown(name: string) {
  return `### ${name}:`;
}

export function getIssueSectionMarkdown(subject: string, issueNumber: string) {
  return ` - ${subject} ([#${issueNumber}](https://github.com/trufflesuite/ganache/issues/${issueNumber}))`;
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

export function getChangelogHead(version: string) {
  return `		<code>&nbsp;<a href="#user-content-${version}-changelog">Changelog</a>&nbsp;</code>
  <img height="36" width="0" src="https://raw.githubusercontent.com/davidmurdoch/px/master/1px.gif">`;
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

[Open new issues](https://github.com/trufflesuite/ganache/issues/new?milestone=7.0.0) (or [join our team](https://consensys.net/open-roles/?discipline=32535/)) to influence what we gets implemented and prioritized.

---

<p align="center">
  💖 The Truffle Team
</p>
`;
}
