/**
 * This file keeps the the tsconfig.json project references up to date with the
 * monorepo dependencies in each package's package.json.
 */

import { readFileSync, existsSync, writeFileSync } from "fs-extra";
import { resolve, join, relative, sep } from "path";

// using `require` because everything in scripts uses typescript's default
// compiler settings, and these two modules require enabling `esModuleInterop`
const JSON5 = require("comment-json");
const glob = require("glob");

type Mapping = { [key: string]: string };

type PackageJson = {
  name: string;
  dependencies?: Mapping;
  devDependencies?: Mapping;
  peerDependencies?: Mapping;
  optionalDependencies?: Mapping;
};

type LernaConfig = {
  packages: string[];
};

type TsConfigFile = {
  compilerOptions?: {
    composite?: boolean;
  };
  references?: { name?: string; path: string }[];
};

type PackageInfo = {
  modified: boolean;
  path: string;
  tsConfig: TsConfigFile;
  name: string;
  references: string[];
};

function flat(arrays: any[][]) {
  return [].concat.apply([], arrays as any);
}

function getConfigByName(name: string) {
  name = name.toUpperCase();
  for (let i = 0, l = configs.length; i < l; i++) {
    const config = configs[i];
    if (config.name.toUpperCase() === name) {
      return config;
    }
  }
  return null;
}

function getConfigByPath(path: string) {
  for (let i = 0, l = configs.length; i < l; i++) {
    const config = configs[i];
    if (config.path === path) {
      return config;
    }
  }
  return null;
}

function updateConfig(config: PackageInfo) {
  const { references, path, tsConfig } = config;
  let tsConfigReferences = tsConfig.references || [];

  // remove existing references if the project no longer exists in the package.json
  tsConfigReferences = tsConfigReferences.filter(tsConfigReference => {
    const existingRefPath = resolve(path, tsConfigReference.path);
    const stillExists = references.some(name => {
      const config = getConfigByName(name);
      if (!config) return false;
      const relPath = config.path;
      if (relPath === existingRefPath) {
        return true;
      } else {
        return false;
      }
    });

    if (!stillExists) {
      config.modified = true;
    }

    return stillExists;
  });

  // add package.json deps to tsconfig references:
  references.forEach(name => {
    const referenceConfig = getConfigByName(name);
    if(!referenceConfig) throw new Error(`missing config ${name}`);

    // projects that are referenced by other projects must have the `composite: true` in their tsconfig compileOptions
    if (
      (!referenceConfig.tsConfig.compilerOptions ||
      !referenceConfig.tsConfig.compilerOptions.composite)
    ) {
      if (!referenceConfig.tsConfig.compilerOptions)
        referenceConfig.tsConfig.compilerOptions = {};
      referenceConfig.tsConfig.compilerOptions.composite = true;
      referenceConfig.modified = true;
    }
    const absPath = referenceConfig.path;
    const relPath = relative(path, absPath).replace(/\\/g, "/"); // only posix paths, please
    const alreadyExists = tsConfigReferences.some(tsConfigReference => {
      const existingRefPath = resolve(path, tsConfigReference.path);
      if (absPath === existingRefPath) {
        return true;
      }
    });
    if (!alreadyExists) {
      config.modified = true;
      tsConfigReferences.push({
        name,
        path: relPath
      });
    }
  });

  if (tsConfigReferences.length === 0) {
    delete tsConfig.references;
  } else {
    tsConfig.references = tsConfigReferences;
  }
}

function updateConfigs(configs: PackageInfo[]) {
  configs.forEach(updateConfig);
}

function saveConfigs(configs: PackageInfo[]) {
  configs.forEach(({ modified, path, tsConfig }) => {
    if (modified) {
      const tsConfigFile = join(path, "tsconfig.json");
      writeFileSync(tsConfigFile, JSON5.stringify(tsConfig, null, 2));
    }
  });
}

const root = join(__dirname, "..");
const { packages } = require(join(root, "lerna.json")) as LernaConfig;

const options = { cwd: root, absolute: true };
const packageDirectories = flat(
  packages.map(pkg => {
    return glob.sync(pkg + "/", options);
  })
).filter(dir => existsSync(join(dir, "package.json")));

function keys(object: {} | undefined) {
  return object ? Object.keys(object) : [];
}

// get all configs
const configs: PackageInfo[] = packageDirectories.map((pkg: any) => {
  const tsConfigFile = join(pkg, "tsconfig.json");
  let tsConfig: TsConfigFile;
  let packageJson: PackageJson;

  tsConfig = JSON5.parse(readFileSync(tsConfigFile, "utf8"));
  packageJson = require(join(pkg, "package.json"));

  // filter for only `@ganache/` dependencies
  const references = [
    ...keys(packageJson.dependencies),
    ...keys(packageJson.devDependencies),
    ...keys(packageJson.peerDependencies),
    ...keys(packageJson.optionalDependencies)
  ].filter(name => name.startsWith("@ganache/") || name === "ganache");

  return {
    modified: false,
    path: pkg.replace(/\//g, sep),
    tsConfig,
    name: packageJson.name,
    references
  };
});

updateConfigs(configs);

saveConfigs(configs);
