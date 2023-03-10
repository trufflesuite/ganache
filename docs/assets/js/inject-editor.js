require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.28.0/min/vs"
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

function getTheme() {
  const styles = getComputedStyle(document.querySelector("#page"));

  const format = str => str.trim().substring(1, 9);

  const bodyText = format(styles.getPropertyValue("--body-text"));
  const text1 = format(styles.getPropertyValue("--editor-text-1"));
  const text3 = format(styles.getPropertyValue("--editor-text-3"));
  const text4 = format(styles.getPropertyValue("--editor-text-4"));
  const text5 = format(styles.getPropertyValue("--editor-text-5"));
  const text6 = format(styles.getPropertyValue("--editor-text-6"));

  const text9 = format(styles.getPropertyValue("--editor-text-9"));
  const text10 = format(styles.getPropertyValue("--editor-text-10"));

  const bg = format(styles.getPropertyValue("--monaco-bg"));
  const ganacheOrangeDimmed = format(
    styles.getPropertyValue("--ganache-orange-dimmed")
  );
  const ganacheOrangeDimmedMore = format(
    styles.getPropertyValue("--ganache-orange-dimmed-more")
  );

  const rules = [
    { token: "", foreground: bodyText },
    { token: "emphasis", fontStyle: "italic" },
    { token: "strong", fontStyle: "bold" },
    { token: "variable", foreground: bodyText },
    { token: "variable.function", foreground: text3 },
    { token: "variable.parameter", foreground: text5 },
    { token: "constant", foreground: text6 },
    { token: "comment", foreground: text9 },
    { token: "number", foreground: text10 },
    { token: "type", foreground: text3 },
    { token: "delimiter", foreground: bodyText },
    { token: "tag", foreground: text6 },
    { token: "key", foreground: bodyText },
    { token: "attribute.name", foreground: text1 },
    { token: "attribute.value.hex.css", foreground: text1 },
    { token: "string", foreground: text4 },
    { token: "keyword", foreground: text6 }
  ];
  const base = getUserColorTheme() === "light" ? "vs" : "vs-dark";
  return {
    base,
    colors: {
      "editor.background": `#${bg}`,
      "editor.selectionBackground": `#${ganacheOrangeDimmed}`,
      "editor.inactiveSelectionBackground": `#${ganacheOrangeDimmedMore}`
    },
    inherit: true,
    rules
  };
}

(function setupColorThemeListener() {
  const pageTheme = document.querySelector("#theme-switch");

  pageTheme.addEventListener("change", e => {
    const newTheme = e.target.checked === true ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    monaco.editor.defineTheme("ganache", getTheme());
  });
})();

require(["vs/editor/editor.main"], function () {
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
  const libSource =
    "declare const provider = {request: any, send: any, once: any, off: any, removeListener: any, on: any, sendAsync: any, disconnect: any, getOptions: any, getInitialAccounts: any};";
  const libUri = "ts:filename/provider.d.ts";
  monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri);
  monaco.editor.createModel(libSource, "typescript", monaco.Uri.parse(libUri));
  monaco.editor.defineTheme("ganache", getTheme());

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let ganachePromise = null;
  async function downloadGanacheIfNeeded() {
    if (Ganache) return;
    if (!ganachePromise) {
      return (ganachePromise = await new Promise(resolve => {
        require(["./assets/js/ganache/ganache.min.js"], g => {
          Ganache = g;
          resolve();
        });
      }));
    } else {
      await ganachePromise;
    }
  }
  let Ganache = null;
  async function run(e, editor, consoleDiv, outputDiv) {
    e.preventDefault();
    e.stopPropagation();

    if (!Ganache) {
      // ganache is lazy
      await downloadGanacheIfNeeded();
    }

    // clean up our user's code
    const code = editor.getValue().replace(/^export \{\/\*magic\*\/\};\n/, "");

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

    try {
      // check that code is valid syntax before trying it
      new AsyncFunction(codeText).toString();

      const fn = new AsyncFunction(
        "ganache",
        "assert",
        "console",
        `with ({provider: ganache.provider()}) {
          try {
            return await (async () => {
              "use strict";
              {
                ${codeText}
              }
            })();
          } catch (e) {
            console.log(e);
          } finally {
            try {
              await provider.disconnect();
              // delete all tmp ganache-core databases
              await indexedDB.databases().then(dbs => {
                return Promise.all(dbs.map(db => {
                  if (db.name.startsWith("/tmp/ganache-core_")) {
                    return indexedDB.deleteDatabase(db.name);
                  }
                }));
              });
            } catch {}
          }
        }`
      );

      await fn(ganache, assert, k);
    } catch (e) {
      k.log("Error executing code:");
      k.log(e.name);
      k.log(e);
      console.error(e);
    }
  }
  const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  const modifierKey = isMacLike ? "⌘" : "Ctrl";

  const hasInsertedEditor = codeNode => codeNode.dataset.displayed === "true";

  const insertEditor = codeNode => {
    // we've already processed this node, so back out
    if (hasInsertedEditor(codeNode)) return;

    const codeText = codeNode.textContent.trim();

    const { consoleContainer, consoleDiv, outputDiv } = createConsole();
    consoleContainer.style.display = "none";
    codeNode.parentNode.parentNode.insertBefore(
      consoleContainer,
      codeNode.parentNode.nextSibling
    );

    const container = document.createElement("div");
    container.style.display = "none";
    container.classList.add("editor-container");
    codeNode.parentNode.parentNode.insertBefore(
      container,
      codeNode.parentNode.nextSibling
    );
    container.style.height =
      Math.max(100, codeText.split(/\n/).length * 19 + 20) + "px";
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
      scrollbar: { alwaysConsumeMouseWheel: false },
      theme: "ganache",
      folding: false,
      lineDecorationsWidth: 12,
      overviewRulerBorder: false,
      contextmenu: false
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

    container.style.display = "";
    codeNode.dataset.displayed = "true";

    const runButton = document.createElement("button");
    runButton.type = "button";
    runButton.innerText = "Run";
    runButton.title = `${modifierKey}+Enter`;
    runButton.classList.add("run-button");
    let running = false;
    if (!ganachePromise) {
      runButton.addEventListener("mouseover", e => {
        downloadGanacheIfNeeded();
      });
    }
    runButton.addEventListener("click", async e => {
      if (running) {
        return;
      }
      consoleContainer.style.display = "block";
      runButton.style.opacity = ".75";
      running = true;
      try {
        await run(e, editor, consoleDiv, outputDiv);
      } finally {
        running = false;
        runButton.style.opacity = "";
      }
    });

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      function () {
        runButton.click();
      }
    );

    editor.addCommand(
      monaco.KeyCode.Escape,
      function () {
        document.activeElement.blur();
      },
      "!suggestWidgetVisible"
    );

    codeNode.parentNode.parentNode.insertBefore(
      runButton,
      codeNode.parentNode.nextSibling
    );
    codeNode.parentNode.remove();
  };
  function renderNodeAndFriends(codeNode) {
    if (!codeNode || !codeNode.isConnected) return;

    observer.unobserve(codeNode);
    const parent =
      codeNode.parentElement.parentElement.parentElement.parentElement;
    insertEditor(codeNode);

    // always load the sibling nodes when there's an intersection
    // this is to try to minimize the flicker that happens when the editor
    // is created while visible
    const loadNode = parentNode => {
      if (parentNode) {
        const node = parentNode.querySelector(".monaco");
        if (node) {
          observer.unobserve(node);
          insertEditor(node);
        }
      }
    };
    loadNode(parent.previousElementSibling);
    loadNode(parent.nextElementSibling);
  }
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        renderNodeAndFriends(entry.target);
      }
    });
  });
  document.querySelectorAll(".monaco").forEach(codeNode => {
    observer.observe(codeNode);
  });
  // when an anchor element is clicked let's pre-emptively start loading it's
  const sidebar = document.querySelector(".sidebar");
  sidebar.addEventListener("mousedown", e => {
    const target = e.target;
    if (target.tagName === "A") {
      const hash = target.getAttribute("href");
      if (hash) {
        const codeNode = document
          .querySelector(hash)
          .parentNode.querySelector(".monaco");
        renderNodeAndFriends(codeNode);
      }
    }
  });
  sidebar.addEventListener("click", e => {
    const target = e.target;
    if (target.tagName === "A") {
      toggleSidebar();
    }
  });
});

const toggleSidebarBtn = document.querySelector("aside");
const main = document.querySelector("article");
function toggleSidebar() {
  document.getElementById("sidebar-switch-button").click();

  // toggleSidebarBtn.classList.toggle("hide");
  // main.classList.toggle("sidebar-open");
}

function makeConsoleEl() {
  const consoleDiv = document.createElement("div");
  consoleDiv.classList.add("console");

  return consoleDiv;
}

function createConsole() {
  const consoleContainer = document.createElement("div");
  consoleContainer.classList.add("console-container");
  consoleContainer.classList.add("monaco-editor-background");

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

  const tabA = document.createElement("button");
  tabA.tabIndex = 0;
  tabA.classList.add("tab");
  tabA.classList.add("tab-active");
  tabA.innerHTML = "Console";
  tabA.onclick = function () {
    tabA.classList.add("tab-active");
    tabB.classList.remove("tab-active");

    consoleDiv.style.display = "flex";
    outputDiv.style.display = "none";
  };

  const tabB = document.createElement("button");
  tabB.tabIndex = 0;
  tabB.classList.add("tab");
  tabB.innerHTML = "Ganache Logs";
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
