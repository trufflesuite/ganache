import {ts, Project, SourceFile} from "ts-morph";
import {resolve, dirname} from "path";
import {NodeFlags} from "typescript";

function trimQuote(path: string) {
  return path.slice(1, path.length - 1);
}

function resolveJsonImport(path: string): string {
  if (path.endsWith(".json")) {
    return path;
  }
  try {
    path = require.resolve(path + ".json");
  } catch (_) {
    return "";
  }
  return path;
}

function serializeToAst(v: any): ts.Expression {
  if (Array.isArray(v)) {
    return ts.createArrayLiteral(v.map(el => serializeToAst(el)));
  }
  switch (typeof v) {
    case "string":
      return ts.createStringLiteral(v);
    case "number":
      return ts.createNumericLiteral(String(v));
    case "boolean":
      return v ? ts.createTrue() : ts.createFalse();
    case "object":
      if (!v) {
        return ts.createNull();
      }
      const keys = Object.keys(v);
      return ts.createObjectLiteral(
        keys.map(k => ts.createPropertyAssignment(ts.createStringLiteral(k), serializeToAst(v[k])))
      );
  }
}

function serializeToTypeAst(v: any): ts.TypeNode {
  if (Array.isArray(v)) {
    return ts.createTupleTypeNode(v.map(el => serializeToTypeAst(el)));
  }
  switch (typeof v) {
    case "string":
      return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case "number":
      return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case "boolean":
      return v ? ts.createTrue() : ts.createFalse();
    case "object":
      if (!v) {
        return ts.createNull();
      }
      const keys = Object.keys(v);
      return ts.createTypeLiteralNode(
        keys.map(k =>
          ts.createPropertySignature(
            undefined,
            ts.createStringLiteral(k),
            undefined,
            serializeToTypeAst(v[k]),
            undefined
          )
        )
      );
  }
}

function resolveJsonImportFromNode(node: ts.ImportDeclaration, sf: SourceFile): string {
  const jsonPath = trimQuote(node.moduleSpecifier.getText());
  return jsonPath && resolveJsonImport(resolve(dirname(sf.getFilePath()), jsonPath));
}

const parseConfigHost: ts.ParseConfigHost = ts.sys;
const configFileName = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, parseConfigHost, "./");
const project = new Project({
  compilerOptions: compilerOptions.options
});
const sources = project.addSourceFilesAtPaths(compilerOptions.fileNames);

sources.forEach(sourceFile => {
  sourceFile.transform(traversal => {
    const node = traversal.visitChildren();
    let jsonPath: string;
    if (ts.isImportDeclaration(node) && (jsonPath = resolveJsonImportFromNode(node, sourceFile))) {
      const namedBindings = node.importClause.namedBindings;
      if ("elements" in namedBindings){
        const jsonFile = require(jsonPath);
        const json = namedBindings.elements.map(element => {
          const name = element.name.text;
          const propertyName = element.propertyName ? element.propertyName.text : name;
          const value = jsonFile[propertyName];
          return ts.createVariableDeclaration(name, serializeToTypeAst(value), serializeToAst(value));
        });
        return ts.createVariableStatement([], ts.createVariableDeclarationList(json, NodeFlags.Const));
      }
    }

    return node;
  });
});

project.emit();
