const escape = require("lodash.escape");
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const makeSvg = (text) => {
  if (!text) {
    throw new Error("missing text argument!");
  }

  const template = readFileSync("./template.svg", "utf-8");
  const newSvg = template.replace("{{text}}", escape(text));

  const fileName = makeFileName(text);

  const path = join(__dirname, "svgs", fileName);

  writeFileSync(path, newSvg);
  return path;
};

const makeFileName = (text) => {
  return text.replace(/[^a-zA-Z0-9]/g, "-").toLocaleLowerCase() + ".svg";
};

const makeImageAnchor = (text) => {
  const fileName = makeFileName(text);
  const name = fileName.replace(/\.svg$/i, "");
  const escaped = escape(text);
  const html = [];
  html.push(
    `<a id="user-content-VERSION-${name}" href="#user-content-VERSION-${name}">`
  );
  html.push(
    `<img alt="${escaped}" width="auto" src="https://raw.githubusercontent.com/trufflesuite/ganache/release-notes-assets/svgs/${fileName}">`
  );
  html.push(`</a>`);
  return html.join("");
};

module.exports = { makeFileName, makeSvg, makeImageAnchor };
