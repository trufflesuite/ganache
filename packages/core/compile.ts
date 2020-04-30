import { ts, ImportDeclarationStructure, Project, ImportDeclaration, SourceFile } from "ts-morph";
import { resolve, dirname } from 'path'
import { NodeFlags } from "typescript";

function trimQuote(path: string) {
  return path.slice(1, path.length - 1)
}

function resolveJsonImport(path: string): string {
  if (path.endsWith('.json')) {
      return path
  }
  try {
      path = require.resolve(path + '.json')
  } catch (_) {
      return ''
  }
  return path
}


function serializeToAst(v: any): ts.Expression {
  if (Array.isArray(v)) {
      return ts.createArrayLiteral(v.map(el => serializeToAst(el)))
  }
  switch (typeof v) {
      case 'string':
          return ts.createStringLiteral(v)
      case 'number':
          return ts.createNumericLiteral(String(v))
      case 'boolean':
          return v ? ts.createTrue() : ts.createFalse()
      case 'object':
          if (!v) {
              return ts.createNull()
          }
          const keys = Object.keys(v)
          return ts.createObjectLiteral(
              keys.map(k => ts.createPropertyAssignment(ts.createStringLiteral(k), serializeToAst(v[k])))
          )
  }
}

function serializeToTypeAst(v: any): ts.TypeNode {
  if (Array.isArray(v)) {
      return ts.createTupleTypeNode(v.map(el => serializeToTypeAst(el)))
  }
  switch (typeof v) {
      case 'string':
          return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      case 'number':
          return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
      case 'boolean':
          return v ? ts.createTrue() : ts.createFalse()
      case 'object':
          if (!v) {
              return ts.createNull()
          }
          const keys = Object.keys(v)
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
          )
  }
}

function resolveJsonImportFromNode(node: ImportDeclaration, sf: SourceFile): string {
  const jsonPath = trimQuote((node as any).moduleSpecifier.getText())
  return jsonPath && resolveJsonImport(resolve(dirname(sf.getFilePath()), jsonPath))
}

import options from "./tsconfig.json";

const project = new Project(options);
const sources = project.addSourceFilesAtPaths("./src/**/*.ts");

sources.forEach(sourceFile => {
  sourceFile.transform(traversal => {
    const node = traversal.visitChildren();
    let jsonPath: string;
    if (ts.isImportDeclaration(node) && (jsonPath = resolveJsonImportFromNode(node as any as ImportDeclaration, sourceFile))){
      console.log(node.moduleSpecifier.getText());
      const namedBindings = node.importClause.namedBindings as ts.NamedImports;
      const jsonFile = require(jsonPath);
      // const n = node as any as ImportDeclarationStructure;
      const json = namedBindings.elements.map(element => {
        const name = element.propertyName ? element.propertyName.getText() : element.getText();
        const value = jsonFile[name];
        return ts.createVariableDeclaration(name, serializeToTypeAst(value), serializeToAst(value))
      })
      return ts.createVariableStatement(
        [],
        ts.createVariableDeclarationList(json, NodeFlags.Const)
      );
    }

    return node;
  });
});

project.emit();
