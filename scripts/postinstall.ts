// using `require` because everything in scripts uses typescript's default
// compiler settings, and this module requires enabling `esModuleInterop`
const chalk = require("chalk");

console.log("");
console.log(
  chalk`{bold.cyan Tip:} {cyan run} {bold.yellow.dim source completions.sh} {cyan to supply bash completions for npm scripts}`
);
console.log("");
