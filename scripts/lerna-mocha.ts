import { LernaExec, replaceSpecialStrings } from "./lerna-exec";

LernaExec("mocha", [
  "--exit",
  "--colors",
  "--check-leaks",
  "--throw-deprecation",
  "--trace-warnings",
  ...replaceSpecialStrings(process.argv.slice(2))
]);
