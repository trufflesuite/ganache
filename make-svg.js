const escape = require("lodash.escape");
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
module.exports = (text) => {
  if (!text) {
    throw new Error("missing text argument!");
  }

  const template = readFileSync("./template.svg", "utf-8");
  const newSvg = template.replace("{{text}}", escape(text));

  const fileName =
    text.replace(/[^a-zA-Z0-9]/g, "-").toLocaleLowerCase() + ".svg";

  const path = join(__dirname, "svgs", fileName);

  writeFileSync(path, newSvg);
  console.log("file written to: ", path);
};
