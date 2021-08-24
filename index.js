const { makeSvg, makeImageAnchor } = require("./helpers");
const args = process.argv.slice(2);

// write the files
args.forEach((arg) => console.log("file written to:", makeSvg(arg)));

// make the html
args.forEach((arg) => {
  console.log(arg);
  console.log(makeImageAnchor(arg));
  console.log("-------------------");
});
