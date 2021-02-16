import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
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

const api = JSON.parse(
  readFileSync(join(__dirname, "../../docs/typedoc/api.json"), "utf8")
);

const ethereum = api.children[0].children.filter(
  a => a.name === "EthereumApi"
)[0];

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

const methods = ethereum.children.filter(
  (method: Method) =>
    method.name !== "constructor" &&
    method.kindString === "Method" &&
    method.flags.isExported
) as Method[];

type Tag = {
  tag: string;
  text: string;
};

type Method = {
  name: string;
  signatures: {
    name: string;
    type: any;
    parameters: any[];
    comment: {
      shortText: string;
      text: string;
      tags: Tag[];
      returns: string;
    };
  }[];
  type: any;
  kindString: string;
  flags: any;
  sources: any[];
};

function renderReturns(method: Method) {
  const comment =
    method.signatures[0].comment && method.signatures[0].comment.returns
      ? method.signatures[0].comment.returns
      : null;
  const returnType = renderReturnType(method);
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
    returnTypeHtml.replace(/\n$/, "") +
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
      const type = getTypeAsString(param.type);
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
  return `<a href="#${e(x(method.name))}">${x(method.name)}</a>`;
}

function renderMethodDocs(method: Method) {
  return `
  <div>
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
  return `<a href="https://github.com/trufflesuite/ganache-core/blob/next/src/${source.fileName}#L${source.line}" target="_blank" rel="noopener">source</a>`;
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

function getTypeAsString(type: any) {
  switch (type.type) {
    case "union":
      return type.types.map(getTypeAsString).join(" | ");
    case "array":
      return `${getTypeAsString(type.elementType)}[]`;
    case "reflection":
      return "object";
    case "intrinsic":
    case "reference":
      return x(type.name);
    case "tuple":
      return `[${
        type.elements ? type.elements.map(getTypeAsString).join(", ") : ""
      }]`;
    case "stringLiteral":
      // outputs a string literal like `He said, "hello, world"!` as
      // the string `"He said, \"hello, world\"!"`
      return `"${type.value.replace(/"/g, '\\"')}"`;
    default:
      console.error(type);
      throw new Error(`Unhandled type: ${type.type}`);
  }
}

function renderReturnType(method: Method) {
  const signature = method.signatures[0];
  let returnType = signature.type.name;
  if (signature.type.typeArguments.length) {
    const typeArgs = signature.type.typeArguments.map(getTypeAsString);
    returnType = `${returnType}<${typeArgs.join(", ")}>`;
  }
  return returnType;
}

function renderSignature(method: Method) {
  const signature = method.signatures[0];
  let params = [];
  if (signature.parameters) {
    params = signature.parameters.map(param => {
      let type = getTypeAsString(param.type);
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

const methodList = [];
const methodDocs = [];
methods.forEach(method => {
  methodList.push(renderMethodLink(method));
  methodDocs.push(renderMethodDocs(method));
});

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ganache Ethereum JSON-RPC Documentation</title>
    <meta name="description" content="Ganache Ethereum JSON-RPC Documentation" />
    <meta name="author" content="David Murdoch" />

    <link rel="shortcut icon" href="./assets/img/favicon.png" />

    <link href="https://fonts.googleapis.com/css?family=Grand+Hotel|Open+Sans:300i,300,400|Oswald:200,400,700|Share+Tech+Mono|Varela+Round&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="./assets/css/main.css" />
    <link rel="stylesheet" href="./assets/css/highlight-truffle.css" />
  </head>
  <body>
    <div class="container">
      <header>
        <h1>Ganache</h1>
      </header>
      <main>
        <aside>
          <nav>
            <ul>
              <li>
              ${methodList.join("</li><li>")}
              </li>
            </ul>
          </nav>
        </aside>
        <article>
          <div class="content">
            <p>Ganache Ethereum JSON-RPC documentation.</p>
          </div>
          ${methodDocs.join("")}
        </article>
      </main>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js" integrity="sha256-0SGl1PJNDyJwcV5T+weg2zpEMrh7xvlwO4oXgvZCeZk=" crossorigin="anonymous"></script>
    <script src="./assets/js/inject-editor.js"></script>
  </body>
</html>
`;

writeFileSync(join(__dirname, "../../docs/index.html"), html);
