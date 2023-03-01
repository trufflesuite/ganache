import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
const { execSync } = require("child_process");
const marked = require("marked");
const hljs = require("highlight.js");

const highlight = () => {
  const raw = {} as any;
  return {
    raw,
    fn: function (code: string, language: string) {
      raw.code = code;
      raw.language = language;
      const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
      return hljs.highlight(validLanguage, code).value;
    }
  };
};

const markedOptions = {
  highlight: highlight().fn
};
type Category = {
  title: string;
  children: number[];
};
type Group = {
  title: string;
  kind: number;
  children: Child[];
  categories: Category[];
};
type Child = {
  children: Child[];
  groups: Group[];
} & Method;
const api = JSON.parse(
  readFileSync(join(__dirname, "../../docs/typedoc/api.json"), "utf8")
) as Child;

const ethereum = api.children[0];

function x(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function e(s: string) {
  return encodeURIComponent(s);
}

type Tag = {
  tag: string;
  text: string;
};

type Type = {
  name: string;
  type: string;
  types: Type[];
  typeArguments: Type[];
  elements: Type[];
  elementType: Type;
  value?: any;
  declaration?: Child;
};

type Comment = {
  shortText: string;
  text: string;
  tags: Tag[];
  returns: string;
};

type Method = {
  id: number;
  name: string;
  signatures: {
    name: string;
    type: Type;
    parameters: {
      name: string;
      type: Type;
      flags: {
        isOptional: boolean;
      };
      comment?: Comment;
    }[];
    comment: Comment;
  }[];
  type: Type;
  kindString: string;
  flags: any;
  sources: any[];
};

function renderReturns(method: Method) {
  const comment =
    method.signatures[0].comment && method.signatures[0].comment.returns
      ? method.signatures[0].comment.returns
      : null;
  let returnType = renderReturnType(method);
  if (returnType.includes("Quantity")) {
    returnType = "QUANTITY";
  }
  if (returnType.includes("Data")) {
    returnType = "DATA";
  }
  const returnTypeHtml = marked(
    `\`\`\`typescript
function g(): ${returnType}
\`\`\``,
    markedOptions
  )
    .replace(
      '<span class="hljs-keyword">function</span> <span class="hljs-title">g</span>(<span class="hljs-params"></span>): ',
      ""
    )
    .replace(/<\/?pre>/g, "");
  let returnHtml =
    returnTypeHtml.replace(/\n/g, "") +
    (comment ? marked.parse(": " + comment, markedOptions) : "");

  return `
      <div>
        <div class="tag">
          returns
        </div>
        <div class="return_type">
          ${returnHtml}
        </div>
      </div>
    `;
}

function renderArgs(method: Method) {
  const signature = method.signatures[0];
  let params: string[] = [];
  if (signature.parameters) {
    params = signature.parameters.map(param => {
      const name = param.name + (param.flags.isOptional ? "?" : "");
      let type = getTypeAsString(param.type);
      if (type.includes("Tag")) {
        type = type.replace("Tag", "TAG");
      }
      const md = `\`\`\`typescript
function (${name}: ${type})
\`\`\``;
      const html = marked(md, markedOptions)
        .replace(/<span class="hljs-keyword">function<\/span> \((.*)\)/, "$1")
        .replace(/<\/?pre>/g, "");
      return `<li>${html}${
        param.comment && param.comment.text && param.comment.text.trim().length
          ? `: ${marked.parseInline(param.comment.text, markedOptions)}`
          : ""
      }</li>`;
    });
    return `
      <div>
        <div class="tag">
          arguments
        </div>
        <ul>
          ${params.join("")}
        </ul>
      </div>
    `;
  }

  return ``;
}

function renderMethodLink(method: Method) {
  const title = x(method.name);
  return `<a href="#${e(title)}">${title}</a>`;
}

function renderMethodDocs(method: Method) {
  return `
  <div class="doc-section">
    <a id="${x(method.name)}"></a>
    <h3 class="signature">
      <a href="#${x(method.name)}">${renderSignature(method)}</a>
    </h3>
    <div class="content small">
      ${renderSource(method)}
    </div>
    <div class="content">
      ${renderMethodComment(method)}
    </div>
    <div class="content">
      ${renderArgs(method)}
    </div>
    <div class="content">
      ${renderReturns(method)}
    </div>

    ${renderTags(method)}
  </div>`;
}

function renderMethodComment(method: Method) {
  const signature = method.signatures[0];
  return signature.comment
    ? `
    ${
      signature.comment.shortText
        ? marked(signature.comment.shortText, markedOptions)
        : ""
    }
    ${
      signature.comment.text
        ? marked(signature.comment.text, markedOptions)
        : ""
    }
  `
    : "";
}

function renderTag(method: Method, tag: Tag, i: number) {
  switch (tag.tag) {
    case "example":
      const h = highlight();
      const code = marked(tag.text, { highlight: h.fn });
      const lang = h.raw.language || "javascript";
      const height = Math.max(100, code.split(/\n/).length * 19 + 20);
      return `
          <div class="content wide-content example_container" style="position: relative">
            <div class="tag content tag_${x(tag.tag)}">
              ${x(tag.tag)}
            </div>
            <div class="monaco-outer-container">
              <div style="height:${height}px" class="monaco-inner-container">
                <div class="monaco" data-method="${x(
                  method.name
                )}_${i}" data-language="${x(lang)}" style="height:${height}px">
                  ${code}
                </div>
              </div>
            </div>
          </div>
        `;
      break;
    default:
      return `
          <div class="content">
            <div class="tag">
              ${x(tag.tag)}
            </div>
            <div>
              ${marked(tag.text, markedOptions)}
            </div>
          </div>
        `;
  }
}

function renderSource(method: Method) {
  const source = method.sources[0];
  let branchOrCommitHash = "master";
  try {
    branchOrCommitHash =
      execSync("git rev-parse HEAD", {
        encoding: "utf8"
      }).trim() || "master";
  } catch (e) {}
  return `<a href="https://github.com/trufflesuite/ganache/blob/${branchOrCommitHash}/src/chains/ethereum/${encodeURIComponent(
    source.fileName
  )}#L${
    source.line
  }" target="_blank" rel="noopener" title="View the source code on GitHub (Opens in a new tab)">source</a>`;
}

function renderTags(method: Method) {
  const signature = method.signatures[0];
  if (
    signature.comment &&
    signature.comment.tags &&
    signature.comment.tags.length
  ) {
    return signature.comment.tags.map(renderTag.bind(null, method)).join("\n");
  }
  return "";
}

function getTypeAsString(type: Type): string {
  switch (type.type) {
    case "union":
      return type.types.map(getTypeAsString).join(" | ");
    case "array":
      return `${getTypeAsString(type.elementType)}[]`;
    case "reflection":
      if (type.declaration) {
        return `{ ${type.declaration.children
          .map(child => {
            return `${child.name}: ${getTypeAsString(child.type)}`;
          })
          .join(", ")} }`;
      } else {
        return "object";
      }
    case "intrinsic":
    case "reference":
      return x(type.name);
    case "tuple":
      return `[${
        type.elements ? type.elements.map(getTypeAsString).join(", ") : ""
      }]`;
    case "literal":
      // outputs a string literal like `He said, "hello, world"!` as
      // the string `"He said, \"hello, world\"!"`
      return `"${type.value.replace(/"/g, '\\"')}"`;
    case "intersection":
      return type.types.map(getTypeAsString).join(" & ");
    case "conditional":
      return getTypeAsString((type as any).checkType);
    default:
      console.error(type);
      throw new Error(`Unhandled type: ${type.type}`);
  }
}

function renderReturnType(method: Method) {
  const signature = method.signatures[0];
  let returnType = signature.type.name;
  if (signature.type.typeArguments.length) {
    let typeArgs = signature.type.typeArguments.map(getTypeAsString);
    typeArgs = typeArgs.map((arg: string) => {
      return arg.replace(/Quantity/g, "QUANTITY").replace(/Data/g, "DATA");
    });
    returnType = `${returnType}<${typeArgs.join(", ")}>`;
  }
  return returnType;
}

function renderSignature(method: Method) {
  const signature = method.signatures[0];
  let params: string[] = [];
  if (signature.parameters) {
    params = signature.parameters.map(param => {
      let type = getTypeAsString(param.type);
      if (type.includes("Tag")) {
        type = type.replace("Tag", "TAG");
      }
      return `${x(param.name)}${param.flags.isOptional ? "?" : ""}: ${type}`;
    });
  }

  const sig = `function ${method.name}(${params.join(
    ", "
  )}): ${renderReturnType(method)}`;

  return hljs
    .highlight("typescript", sig)
    .value.replace('<span class="hljs-keyword">function</span>', "");
}

/**
 * Array of api method namespaces in the order they should appear on the page.
 */
const orderedNamespaces = [
  "eth",
  "debug",
  "evm",
  "miner",
  "personal",
  "txpool",
  "web3",
  "db",
  "rpc",
  "net",
  "bzz",
  "shh",
  "other"
];

const groupedMethods: { [group: string]: Method[] } = {};
for (const child of ethereum.children) {
  const { name } = child;
  if (name === "constructor" || child.kindString !== "Method") continue;

  const parts = name.split("_");
  let namespace = "other";
  if (parts.length > 1) {
    if (!parts[1]) {
      console.warn(`method name is only namespace ${name}`);
      // we can't put this one on the page and have it look right, so skip
      continue;
    }
    if (parts[0]) {
      namespace = parts[0];
    }
  }
  if (namespace === "other") {
    console.warn(`method does not have namespace prefix: ${name}`);
  }
  if (!orderedNamespaces.includes(namespace)) {
    console.warn(
      `method namespace is not included in set of namespaces for ordering: ${name}`
    );
    orderedNamespaces.push(namespace);
  }
  const methodsInGroup = groupedMethods[namespace];
  if (methodsInGroup) {
    methodsInGroup.push(child);
  } else {
    groupedMethods[namespace] = [child];
  }
}

const methodListByGroup: string[] = [];
const methodDocs: string[] = [];

for (const namespace of orderedNamespaces) {
  const methodsInGroup = groupedMethods[namespace];
  if (methodsInGroup) {
    const methodListForGroup: string[] = [];
    methodDocs.push(
      `<div class="content category-header"><h2>${namespace} namespace</h2></div>`
    );
    for (const method of methodsInGroup) {
      if (method) {
        methodListForGroup.push(renderMethodLink(method));
        methodDocs.push(renderMethodDocs(method));
      }
    }
    methodListByGroup.push(
      `<details open>
        <summary>
          <img src="./assets/img/chevron.svg" alt="" />
          ${namespace}
        </summary>
        <ul>
          <li>${methodListForGroup.join("</li><li>")}</li>
        </ul>
      </details>`
    );
  }
}

const preamble =
  marked(`This reference describes all Ganache JSON-RPC methods and provides interactive examples for each method. The interactive examples are powered by [Ganache in the Browser](https://github.com/trufflesuite/ganache/#browser-use) and demonstrate using Ganache programmatically [as an EIP-1193 provider](https://github.com/trufflesuite/ganache/#as-an-eip-1193-provider-only). Try running these examples to see Ganache in action! Each editor can be changed to further test Ganache features.

**Pro Tip**: You can define your own provider by adding \`const provider = ganache.provider({})\` to the start of any example and passing in your [startup options](https://trufflesuite.com/docs/ganache/reference/cli-options/).`);

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ganache Ethereum JSON-RPC Documentation</title>
    <meta name="description" content="Ganache Ethereum JSON-RPC Documentation" />
    <meta name="author" content="David Murdoch" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="./assets/js/preload.js"></script>
    <link rel="shortcut icon" href="./assets/img/favicon.png" />

    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300i,300,400|Share+Tech+Mono&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css?family=Grand+Hotel&text=Ganache" rel="stylesheet" />
    <link rel="stylesheet" href="./assets/css/main.css" />
    <link rel="stylesheet" href="./assets/css/highlight-truffle.css" />
  </head>
  <body>
    <input type="checkbox" id="sidebar-switch" tabindex="1">
    <input type="checkbox" id="theme-switch" tabindex="2">
    <div class="container" id="page">
      <header>
        <svg style="position:absolute;pointer-events:none;opacity:0;" width="10" height="10" viewBox="0 0 10 10">
          <clipPath id="squircleClip" clipPathUnits="objectBoundingBox">
            <path
              fill="red"
              stroke="none"
              d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"
            />
          </clipPath>
        </svg>
        <label id="sidebar-switch-button" for="sidebar-switch" title="Toggle menu"></label>
        <a class="ganache-link" tabindex="1" href="https://trufflesuite.com/docs/ganache/" title="Ganache Website">
          <img src="./assets/img/ganache-logomark.svg" alt="ganache logo"/>
          <h1>Ganache</h1>
        </a>
        <div class="header-actions">
          <label class="header-action" id="color-switcher" for="theme-switch">
            <div>
              <img src="./assets/img/sun.svg" id="sun" class="logo" title="Change color theme to light mode" />
              <img src="./assets/img/moon.svg" id="moon" class="logo" title="Change color theme dark mode" />
            </div>
          </label>
          <a class="header-action" href="https://twitter.com/trufflesuite/" target="_blank" rel="noopener noreferrer" title="Twitter">
            <div>
              <img src="./assets/img/twitter.svg" class="logo" alt="twitter logo"/>
            </div>
          </a>
          <a class="header-action" href="https://github.com/trufflesuite/ganache#readme" target="_blank" rel="noopener noreferrer" title="Ganache Github README" >
            <div>
              <img src="./assets/img/github-logo.svg" class="logo" alt="github logo"/>
            </div>
          </a>
        </div>
      </header>
      <main>
        <aside class="hide">
          <nav class="sidebar">
              ${methodListByGroup.join("")}
          </nav>
        </aside>
        <article>
          <div class="content preamble">
            <h2>Ganache JSON-RPC Documentation</h2>
            <p>${preamble}</p>
          </div>
          ${methodDocs.join("")}
        </article>
      </main>
    </div>
    <script> 
      (function initColorTheme() {
        const theme = getUserColorTheme();
        const checked = theme === "light" ? true : false;
        document.querySelector("#theme-switch").checked = checked;
      })();
    </script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js" integrity="sha512-c3Nl8+7g4LMSTdrm621y7kf9v3SDPnhxLNhcjFJbKECVnmZHTdo+IRO05sNLTH/D3vA6u1X32ehoLC7WFVdheg==" crossorigin="anonymous"></script>
    <script src="./assets/js/inject-editor.js"></script>
  </body>
</html>
`;

writeFileSync(join(__dirname, "../../docs/index.html"), html);
