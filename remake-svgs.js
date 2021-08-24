const { readFileSync, rmSync } = require("fs");
const { readdir } = require("fs/promises");
const unescape = require("lodash.unescape");
const { join } = require("path");
const { makeSvg } = require("./helpers");

(async function () {
  const files = await readdir(join(__dirname, "svgs"));
  for (const file of files) {
    console.log(file);
    if (file.endsWith(".svg")) {
      const data = readFileSync(file, "utf-8");
      const re = />(.+?)<\/text>/g;
      const match = re.exec(data);
      if (match) {
        const text = unescape(match[1]);
        rmSync(file);
        const path = makeSvg(text);
        console.log(text);
        console.log(path);
        console.log(makeImageAnchor(text));
        console.log("-------------------");
      }
    }
  }
})();
