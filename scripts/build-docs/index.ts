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
  let params = [];
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
  return `<div>---</div><a href="#${e(
    x(method.name)
  )}" onclick="toggleSidebar()">${x(method.name)}</a>`;
}

function renderMethodDocs(method: Method) {
  return `
  <div class="doc-section">
    <a name="${x(method.name)}"></a>
    <h3 class="signature">
      ${renderSignature(method)}
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
      return `
          <div class="content wide-content example_container" style="position: relative">
            <div class="tag content tag_${x(tag.tag)}">
              ${x(tag.tag)}
            </div>
            <div class="monaco" data-method="${x(
              method.name
            )}_${i}" data-language="${x(lang)}">
              ${code}
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

  return `<a href="https://github.com/trufflesuite/ganache/blob/${branchOrCommitHash}/src/chains/ethereum/${source.fileName}#L${source.line}" target="_blank" rel="noopener">source</a>`;
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
      `<details open><summary>${namespace}</summary><ul><li>${methodListForGroup.join(
        "</li><li>"
      )}</li></ul></details>`
    );
  }
}

const preamble =
  marked(`This reference describes all Ganache JSON-RPC methods and provides interactive examples for each method. The interactive examples are powered by [Ganache in the Browser](https://github.com/trufflesuite/ganache/#browser-use) and demonstrate using Ganache programmatically [as an EIP-1193 provider](https://github.com/trufflesuite/ganache/#as-an-eip-1193-provider-only). Try running these examples to see Ganache in action! Each editor can be changed to further test Ganache features.

**Pro Tip**: You can define your own provider by adding \`const provider = ganache.provider({})\` to the start of any example and passing in some [startup options](https://trufflesuite.com/docs/ganache/reference/cli-options/).`);

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ganache Ethereum JSON-RPC Documentation</title>
    <meta name="description" content="Ganache Ethereum JSON-RPC Documentation" />
    <meta name="author" content="David Murdoch" />

    <link rel="shortcut icon" href="./assets/img/favicon.png" />

    <link href="https://fonts.googleapis.com/css?family=Grand+Hotel|Open+Sans:300i,300,400|Oswald:200,400,700|Share+Tech+Mono|Varela+Round&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.12.0/css/all.css" integrity="sha384-ekOryaXPbeCpWQNxMwSWVvQ0+1VrStoPJq54shlYhR8HzQgig1v5fas6YgOqLoKz" crossorigin="anonymous" />
    <link rel="stylesheet" href="./assets/css/main.css" />
    <link rel="stylesheet" href="./assets/css/highlight-truffle.css" />
  </head>
  <body>
    <div class="container">
      <header>
        <span onclick="toggleSidebar()">
          <i class="fas fa-bars"></i>
        </span>
        <a class="ganache-link" href="https://trufflesuite.com/docs/ganache/">
          <img src="./assets/img/ganache-logomark.svg" class="logo"/>
          <h1>Ganache</h1>
        </a>
        <a class="github-link" href="https://github.com/trufflesuite/ganache">
          <svg viewBox="0 0 16 16" class="logo">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
        </a>
      </header>
      <main>
        <aside>
          <nav class="sidebar hide">
              ${methodListByGroup.join("")}
          </nav>
        </aside>
        <div class="sidebar-spacer hide"></div>
        <article>
          <div class="content preamble">
          <h2>Ganache JSON-RPC Documentation</h2>
            <p>${preamble}</p>
          </div>
            ${methodDocs.join("")}
        </article>
      </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/ganache@7.5.0/dist/web/ganache.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js" integrity="sha256-0SGl1PJNDyJwcV5T+weg2zpEMrh7xvlwO4oXgvZCeZk=" crossorigin="anonymous"></script>
    <script src="./assets/js/inject-editor.js"></script>
    <script>
      function toggleSidebar() {
        const toggleSidebarBtn = document.querySelector(".sidebar");
        const spacer = document.querySelector(".sidebar-spacer");
        const main = document.querySelector("article");
        toggleSidebarBtn.classList.toggle("hide");
        spacer.classList.toggle("hide");
        main.classList.toggle("sidebar-open");
      }
    </script>
  </body>
</html>
`;

writeFileSync(join(__dirname, "../../docs/index.html"), html);
