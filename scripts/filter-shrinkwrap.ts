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
  if (leaf.dependencies) {
    mutate(leaf);
    Object.entries(leaf.dependencies).forEach(([name, entry]) => {
      walk(entry, mutate);
    });
  }
}

function deleteDevDepsFromLeaf(leaf: Leaf) {
  if (leaf.dependencies) {
    Object.entries(leaf.dependencies).forEach(([name, entry]) => {
      if (entry.dev) {
        console.log(`removing ${name} from shrinkwrap`);
        delete leaf.dependencies[name];
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
