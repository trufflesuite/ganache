import { writeFileSync } from "fs-extra";

type Leaf = {
  dev?: boolean;
  dependencies?: {
    [name: string]: Leaf;
  };
};
type Root = {
  name: string;
  lockfileVersion: number;
  requires?: boolean;
} & Leaf;

const shrinkwrapFile = process.argv[2];

if (!shrinkwrapFile || !shrinkwrapFile.endsWith("npm-shrinkwrap.json")) {
  throw new Error(
    "Usage: ts-node filter-shrinkwrap.json ./path/to/npm-shrinkwrap.json"
  );
}

console.log(`loading ${shrinkwrapFile}`);
const shrinkwrap: Root = require(shrinkwrapFile);
let removeCount = 0;

function walk(leaf: Leaf, mutate: (leaf: Leaf) => void) {
  const dependencies = leaf.dependencies;
  if (dependencies) {
    mutate(leaf);
    Object.entries(dependencies).forEach(([name, entry]) => {
      walk(entry, mutate);
    });
  }
}

function deleteDevDepsFromLeaf(leaf: Leaf) {
  const dependencies = leaf.dependencies;
  if (dependencies) {
    Object.entries(dependencies).forEach(([name, entry]) => {
      if (entry.dev) {
        console.log(`removing ${name} from shrinkwrap`);
        removeCount++;
        delete dependencies[name];
      }
    });
  }
}

console.log(`removing development dependencies`);
walk(shrinkwrap, deleteDevDepsFromLeaf);
console.log(
  `removed ${removeCount} dependenc${removeCount === 1 ? "y" : "ies"}`
);

console.log(`writing updated shrinkwrap to ${shrinkwrapFile}`);
writeFileSync(shrinkwrapFile, JSON.stringify(shrinkwrap));
