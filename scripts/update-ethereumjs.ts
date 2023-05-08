// search through all folders in the parent directory to find all package.json
// files. Then read each file looking for ethereumjs dependencies,
// devDependencies, or optionalDependencies. If found, update the version
// number to the latest version on npm (by querying the npm registry).

import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as child_process from "child_process";
import * as https from "https";

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const exec = util.promisify(child_process.exec);

const parentDir = path.resolve(__dirname, "../");

async function findPackageFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const dirents = await readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory() && dirent.name !== "node_modules") {
      const subFiles = await findPackageFiles(res);
      files.push(...subFiles);
    } else if (dirent.isFile() && dirent.name === "package.json") {
      files.push(res);
    }
  }

  return files;
}

const cache = new Map<string, Buffer>();

async function updateDependencies(packagePath: string) {
  const packageData = await readFile(packagePath, { encoding: "utf-8" });
  const packageJson = JSON.parse(packageData);

  const dependencies = [
    [[...Object.entries(packageJson.dependencies ?? {})], "dependencies"],
    [[...Object.entries(packageJson.devDependencies ?? {})], "devDependencies"],
    [
      [...Object.entries(packageJson.optionalDependencies ?? {})],
      "optionalDependencies"
    ]
  ] as [[string, string][], string][];

  let changed = false;

  for (const [matches, group] of dependencies) {
    for (const [name, version] of matches) {
      if (name.startsWith("@ethereumjs/")) {
        const response = cache.has(name)
          ? cache.get(name)!
          : await new Promise<Buffer>((resolve, reject) => {
              https
                .get(`https://registry.npmjs.org/${name}`, res => {
                  const chunks: Uint8Array[] = [];
                  res.on("data", chunk => chunks.push(chunk));
                  res.on("end", () => resolve(Buffer.concat(chunks)));
                })
                .on("error", reject);
            });
        if (cache.has(name)) {
          cache.set(name, response);
        }
        const registryData = JSON.parse(response.toString());
        const latestVersion = registryData["dist-tags"].latest;
        if (version !== latestVersion) {
          packageJson[group][name] = latestVersion;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  }
}

async function main() {
  const packagePaths = await findPackageFiles(parentDir);

  for (const packagePath of packagePaths) {
    await updateDependencies(packagePath);
  }

  await exec("npm run reinstall", { cwd: parentDir });
}

main().catch(console.error);
