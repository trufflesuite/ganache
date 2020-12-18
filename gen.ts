import { readFileSync, writeFileSync } from "fs";
import marked from "marked";
import hljs from "highlight.js";

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code, language) {
    const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
    return hljs.highlight(validLanguage, code).value;
  }
});

const api = JSON.parse(readFileSync("./docs/typedoc/api.json", "utf8"));
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
    };
  }[];
  type: any;
  kindString: string;
  flags: any;
  sources: any[];
};

function renderReturns(method: Method) {
  return `
      <div>
        <div class="tag">
          returns
        </div>
        <ul>
          WIP
        </ul>
      </div>
    `;
}

function renderArgs(method: Method) {
  const signature = method.signatures[0];
  let params = [];
  if (signature.parameters) {
    params = signature.parameters.map(param => {
      let type = getTypeAsString(param.type);
      return `<li>${x(param.name)}: ${type}${
        param.comment && param.comment.text ? `: ${param.comment.text}` : ""
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

  return `
  <div>
    <div class="tag">
      arguments
    </div>
    <div>
      none
    </div>
  </div>`;
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
      ${renderComment(method)}
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

function renderComment(method: Method) {
  const signature = method.signatures[0];
  return signature.comment
    ? `
    ${signature.comment.shortText ? marked(signature.comment.shortText) : ""}
    ${signature.comment.text ? marked(signature.comment.text) : ""}
  `
    : "";
}
function renderTag(tag: Tag) {
  switch (tag.tag) {
    case "example":
      return `
          <div class="content wide-content" style="position: relative">
            <div class="tag content">
              ${x(tag.tag)}
            </div>
            <div class="monaco">
              ${marked(tag.text)}
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
              ${marked(tag.text)}
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
    return signature.comment.tags.map(renderTag).join("\n");
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
    default:
      console.error(type);
      throw new Error(`Unhandled type: ${type.type}`);
  }
}

function renderSignature(method: Method) {
  const signature = method.signatures[0];
  let params = [];
  if (signature.parameters) {
    params = signature.parameters.map(param => {
      let type = getTypeAsString(param.type);
      return `${x(param.name)}: ${type}`;
    });
  }

  let returnType = signature.type.name;
  if (signature.type.typeArguments.length) {
    const typeArgs = signature.type.typeArguments.map(getTypeAsString);
    returnType = `${returnType}<${typeArgs.join(", ")}>`;
  }
  const sig = `function ${method.name}(${params.join(", ")}): ${returnType}`;

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

declare function f(a: string, b: Buffer | Tag | string): Promise<any>;

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ganache Ethereum JSON-RPC Documentation</title>
    <meta name="description" content="Ganache Ethereum JSON-RPC Documentation" />
    <meta name="author" content="David Murdoch" />

    <link rel="shortcut icon" href="./docs/assets/img/favicon.png" />

    <link href="https://fonts.googleapis.com/css?family=Grand+Hotel|Open+Sans:300i,300,400|Oswald:200,400,700|Share+Tech+Mono|Varela+Round&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="./docs/assets/css/highlight-truffle.css" />

    <style>
      :root {
        --main-bg-color: #33262a;
        --medium-bg-color: rgba(255,255,255,.1);
        --body-text: #fff0e1;
        --turquoise: #3FE0C5;
        --porsche: #e4a663;
        --light-porsche: #f7e6d5;
        --light-turquoise: #99F4E5;
        --medium-dark-turquoise: #1BD4B5;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --main-bg-color: #fff;
          --medium-bg-color: rgba(0,0,0,.05);
          --body-text: #5e464d;

          --turquoise: #258575;
          --porsche: #785632;
          --light-porsche: #736456;
          --light-turquoise: #4b7a73;
          --medium-dark-turquoise: #12826f;
        }
      }
      html, body {
        background-color: var(--main-bg-color);
        margin: 0;
        padding: 0;
        color: var(--body-text);
        font-family: 'Open Sans', sans-serif;
      }
      h1 {
        color: var(--porsche);
        font-family: "Grand Hotel";
        font-weight: normal;
        margin: .5rem .5rem .5rem 1rem;
      }
      .signature {
        font-size: 1em;
        padding:1.5em 2em;
        background: var(--medium-bg-color);
        margin-top:0;
        font-family: "Share Tech Mono", monospace;
      }
      a {
        color: var(--turquoise);
        text-decoration: none;
      }
      a:hover, a:focus {
        color: var(--turquoise);
        text-decoration: underline;
      }
      .small {
        font-size:.9em;
      }
      .container {
        display: flex;
        height: 100vh;
        flex-direction: column;
      }
      .tag {
        font-weight: bold;
        font-size: 1.1em;
      }
      header {
        background-color: var(--main-bg-color);
        box-shadow: 0 6px 6px rgba(0,0,0, .25);
        z-index:999;
      }
      main {
        display: flex;
        overflow: auto;
      }
      aside {
        overflow: auto;
      }
      aside ul {
        list-style: none;
        padding-left:1.5rem;
        margin: 1rem 0;
      }
      aside ul li {
        margin: .5rem 1rem .5rem 0;
      }
      article {
        flex: 1;
        overflow: auto;
      }
      article div.content {
        padding: 0 2rem;
      }
      article div.wide-content{
        padding: 0 0;
      }
    </style>
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
          ${methodDocs.join("")}
        </article>
      </main>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js" integrity="sha256-0SGl1PJNDyJwcV5T+weg2zpEMrh7xvlwO4oXgvZCeZk=" crossorigin="anonymous"></script>
    <script src="./docs/assets/js/inject-editor.js"></script>
  </body>
</html>
`;

writeFileSync("docs.html", html);
