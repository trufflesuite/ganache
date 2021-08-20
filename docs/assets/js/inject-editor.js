require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.21.2/min/vs"
  }
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

require([
  "./assets/js/ganache/ganache.min.js",
  "vs/editor/editor.main"
], function (Ganache) {
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    allowJs: true,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
  });
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    allowJs: true,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
  });
  const libSource = `declare const provider = {request: any, send: any, once: any, off: any, removeListener: any, on: any, sendAsync: any, disconnect: any, getOptions: any, getInitialAccounts: any};`;
  const libUri = "ts:filename/provider.d.ts";
  monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri);
  monaco.editor.createModel(libSource, "typescript", monaco.Uri.parse(libUri));

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  document.querySelectorAll(".monaco").forEach(codeNode => {
    async function run(e) {
      e.preventDefault();
      e.stopPropagation();

      // clean up out user's code
      const code = editor
        .getValue()
        .replace(/^export \{\/\*magic\*\/\};\n/, "");

      consoleDiv.innerHTML = "";
      outputDiv.innerHTML = "";

      const makeConsole = element => {
        return {
          log: (...args) => {
            // very naive console implementation
            const line = document.createElement("div");
            line.classList.add("mtk1");
            line.classList.add("console-line");
            line.innerHTML = args
              .map(a => {
                if (a instanceof Error) {
                  return (
                    "<pre style='white-space:pre-wrap'>" +
                    escapeHtml(
                      JSON.stringify(
                        { ...a, message: a.message, stack: a.stack },
                        null,
                        2
                      )
                    ) +
                    "</pre>"
                  );
                } else if (typeof a === "object") {
                  try {
                    return (
                      "<pre style='white-space:pre-wrap'>" +
                      escapeHtml(JSON.stringify(a, null, 2)) +
                      "</pre>"
                    );
                  } catch {
                    return escapeHtml(a);
                  }
                } else if (typeof a === "string") {
                  return (
                    "<pre style='white-space:pre-wrap'>" +
                    escapeHtml(a) +
                    "</pre>"
                  );
                } else {
                  return escapeHtml("" + a);
                }
              })
              .join(" ");
            element.prepend(line);
          }
        };
      };
      const k = makeConsole(consoleDiv);
      const ganache = {
        provider: (options = {}) => {
          delete options.logger;
          if (!options.logging) {
            options.logging = {};
          }
          options.logging.logger = makeConsole(outputDiv);
          return Ganache.provider(options);
        }
      };
      const codeText = code.trim();
      const assert = a => {
        if (a) return true;
        throw new Error("not equal");
      };
      assert.strictEqual = (a, b) => {
        if (a === b) return true;
        throw new Error("not strict equal");
      };

      const fn = new AsyncFunction(
        "ganache",
        "assert",
        "console",
        `with ({provider: ganache.provider()}) {
          try {
            return await (async () => {
              "use strict";
              ${codeText}
            })();
          } catch (e) {
            console.log(e);
          } finally {
            try {
              // await provider.disconnect();
              // delete all tmp ganache-core databases
              await indexedDB.databases().then(dbs => {
                return Promise.all(dbs.map(db => {
                  if (db.name.startsWith("/tmp/ganache-core_")) {
                    // return indexedDB.deleteDatabase(db.name);
                  }
                }));
              });
            } catch {}
          }
        }`
      );
      await fn(ganache, assert, k);
    }

    const codeText = codeNode.innerText.trim();

    const { consoleContainer, consoleDiv, outputDiv } = createConsole();
    consoleContainer.style.display = "none";
    codeNode.parentNode.insertBefore(consoleContainer, codeNode.nextSibling);

    const container = document.createElement("div");
    container.classList.add("editor-container");
    codeNode.parentNode.insertBefore(container, codeNode.nextSibling);
    codeNode.style.display = "none";
    container.style.height =
      Math.max(100, codeText.split(/\n/).length * 20 + 20) + "px";

    const editor = monaco.editor.create(container, {
      automaticLayout: true,
      model: monaco.editor.createModel(
        // we prepend `export {/*magic*/}` so the typechecker doesn't think the code is global and shared between editors
        "export {/*magic*/};\n" + codeText,
        codeNode.dataset.language || "javascript",
        monaco.Uri.parse(`js:${codeNode.dataset.method}.js`)
      ),
      lineNumbers: "off",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      theme: "vs-dark"
    });
    // hide the first line (export {/*magic*/};)
    editor.setHiddenAreas([{ startLineNumber: 1, endLineNumber: 1 }]);

    editor.onDidChangeCursorSelection(e => {
      // because we hide the first line we need to make sure the user can't select it
      if (
        e.selection.startLineNumber === 1 ||
        e.selection.selectionStartLineNumber === 1 ||
        e.selection.positionLineNumber === 1
      ) {
        e.selection.startLineNumber = Math.max(e.selection.startLineNumber, 2);
        e.selection.selectionStartLineNumber = Math.max(
          e.selection.selectionStartLineNumber,
          2
        );
        e.selection.positionLineNumber = Math.max(
          e.selection.positionLineNumber,
          2
        );
        editor.setSelection(e.selection);
      }
    });

    const runButton = document.createElement("div");
    runButton.innerText = "▶ Try it!";
    runButton.classList.add("run-button");
    runButton.addEventListener("click", async e => {
      consoleContainer.style.display = "block";
      runButton.style.opacity = ".5";
      await run(e);
      runButton.style.opacity = "";
    });
    codeNode.parentNode.insertBefore(runButton, codeNode.nextSibling);
  });
});

function makeConsoleEl() {
  const consoleDiv = document.createElement("div");
  consoleDiv.classList.add("monaco-editor-background");
  consoleDiv.classList.add("console");

  return consoleDiv;
}

function createConsole() {
  const consoleContainer = document.createElement("div");
  consoleContainer.classList.add("console-container");

  const consoleDiv = makeConsoleEl();
  const outputDiv = makeConsoleEl();
  outputDiv.style.display = "none";

  consoleContainer.appendChild(createTabs(consoleDiv, outputDiv));
  consoleContainer.appendChild(consoleDiv);
  consoleContainer.appendChild(outputDiv);

  return { consoleContainer, consoleDiv, outputDiv };
}

function createTabs(consoleDiv, outputDiv) {
  const tabContainer = document.createElement("div");
  tabContainer.classList.add("tab-container");
  tabContainer.classList.add("monaco-editor-background");

  const tabA = document.createElement("div");
  tabA.classList.add("tab");
  tabA.classList.add("tab-active");
  tabA.innerHTML = "Console";
  tabA.onclick = function () {
    tabA.classList.add("tab-active");
    tabB.classList.remove("tab-active");

    consoleDiv.style.display = "flex";
    outputDiv.style.display = "none";
  };

  const tabB = document.createElement("div");
  tabB.classList.add("tab");
  tabB.innerHTML = "Logs";
  tabB.onclick = function () {
    tabB.classList.add("tab-active");
    tabA.classList.remove("tab-active");

    outputDiv.style.display = "flex";
    consoleDiv.style.display = "none";
  };

  tabContainer.appendChild(tabA);
  tabContainer.appendChild(tabB);
  return tabContainer;
}
