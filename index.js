const makeSvg = require("./make-svg");
const args = process.argv.slice(2);
args.forEach((arg) => {
  makeSvg(arg);
});
