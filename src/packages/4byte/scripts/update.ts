import * as fs from "fs";
import * as path from "path";

function generateFileContentsProgram(
  directoryPath: string,
  outputFilePath: string
): void {
  const fileContentsMap = readFiles(directoryPath);

  const program = `// Generated file contents
const fourBytes: Map<number, string> = new Map([
  ${generateFileContentEntries(fileContentsMap)}
]);
export { fourBytes };
`;

  fs.writeFileSync(outputFilePath, program);
}

function readFiles(directoryPath: string): Map<string, string> {
  const fileContentsMap = new Map<string, string>();
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const subDirectoryContents = readFiles(filePath);
      subDirectoryContents.forEach((content, filename) => {
        fileContentsMap.set(filename, content);
      });
    } else {
      const fileContents = fs.readFileSync(filePath, "utf-8");
      fileContentsMap.set(file, fileContents);
    }
  }

  return fileContentsMap;
}

function generateFileContentEntries(
  fileContentsMap: Map<string, string>
): string {
  let entries = "";
  fileContentsMap.forEach((content, filename) => {
    // only consider the first signature in the file
    const firstSig = content.split(";", 1)[0];
    entries += `[${parseInt("0x" + filename)}, '${escapeString(firstSig)}'],\n`;
  });
  return entries;
}

function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const directoryPath = path.join(__dirname, "../", "4bytes/signatures");
const outputFilePath = path.join(__dirname, "../", "index.ts");
generateFileContentsProgram(directoryPath, outputFilePath);
