import { existsSync, copySync, writeFileSync } from "fs-extra";
import { join } from "path";
const glob = require("glob");

function flat<T>(arrays: T[][]) {
  return [].concat.apply([], arrays) as T[];
}
const root = join(__dirname, "..", "..", "..", "..");
const options = { cwd: root, absolute: true };

// get list of packages directories from lerna
const packages = require(join(root, "lerna.json")).packages as string[];

// find all packages
const packageDirectories = flat(
  packages.map(pkg => {
    return glob.sync(pkg + "/", options) as string[];
  })
).filter(dir => existsSync(join(dir, "typings")));

function convertName(name: string) {
  return "@types/" + name.replace("@", "").replace("/", "__");
}

// copy types over
packageDirectories
  .map(dir => ({
    dir,
    name: require(join(dir, "package.json")).name
  }))
  .filter(({ name }) => name !== "ganache")
  .forEach(({ name, dir }) => {
    const typesName = convertName(name);
    const source = join(dir, "typings");

    const folder = join(__dirname, "..", "lib", "node_modules", typesName);

    const destination = join(folder, "typings");
    copySync(source, destination);

    const indexDestination = join(folder, "index.d.ts");
    writeFileSync(indexDestination, 'export * from "./typings"');
  });
