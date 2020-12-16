// remove the typedoc theme's keydown handler so we can type in our monaco-editors
$("body").off("keydown");

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
  "../../assets/js/ganache/ganache.min.js",
  "vs/editor/editor.main"
], function (Ganache) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  document.querySelectorAll(".monaco").forEach(codeNode => {
    async function run(e) {
      e.preventDefault();
      e.stopPropagation();

      const code = editor.getValue();

      consoleDiv.innerHTML = "";

      const k = {
        log: (...args) => {
          // very naive console implementation
          const line = document.createElement("div");
          line.className = "mtk1";
          line.innerHTML = args
            .map(a => {
              if (typeof a === "object") {
                try {
                  return (
                    "<pre>" + escapeHtml(JSON.stringify(a, null, 2)) + "</pre>"
                  );
                } catch {
                  return escapeHtml(a);
                }
              } else if (typeof a === "string") {
                return "<pre>" + escapeHtml(a) + "</pre>";
              } else {
                return escapeHtml("" + a);
              }
            })
            .join(" ");
          consoleDiv.appendChild(line);
        }
      };
      const ganache = {
        provider: (options = {}) => {
          delete options.logger;
          if (!options.logging) {
            options.logging = {};
          }
          options.logging.logger = k;
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
              ;
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

    const consoleDiv = document.createElement("div");
    consoleDiv.className = "monaco-editor-background";
    consoleDiv.style.borderTop = "solid 1px #393939";
    consoleDiv.style.fontFamily =
      '"Droid Sans Mono", monospace, monospace, "Droid Sans Fallback"';
    consoleDiv.style.fontSize = "14px";
    consoleDiv.style.fontFeatureSettings = '"liga" 0, "calt" 0';
    consoleDiv.style.lineHeight = "19px";
    consoleDiv.style.letterSpacing = "0px";
    consoleDiv.style.height = "200px";
    consoleDiv.style.position = "relative";
    consoleDiv.style.overflow = "auto";
    consoleDiv.style.padding = ".3em 26px";
    codeNode.parentNode.insertBefore(consoleDiv, codeNode.nextSibling);

    const container = document.createElement("div");
    codeNode.parentNode.insertBefore(container, codeNode.nextSibling);
    codeNode.style.display = "none";
    container.style.height = "600px";

    const editor = monaco.editor.create(container, {
      value: codeNode.innerText.trim(),
      language: "javascript", // TODO, get language from element
      // lineNumbers: "off",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      theme: "vs" // use light theme until
    });

    const runButton = document.createElement("button");
    runButton.innerText = "Run";
    runButton.addEventListener("click", run);
    codeNode.parentNode.insertBefore(runButton, codeNode.nextSibling);
  });
});
