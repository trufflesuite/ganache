import ts from "typescript";
import path from "path";

export default function transformer(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) =>
    visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext
): ts.SourceFile;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext
): ts.Node | undefined;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext
): ts.Node | undefined {
  return ts.visitEachChild(
    visitNode(node, program),
    childNode => visitNodeAndChildren(childNode, program, context),
    context
  );
}

function visitNode(node: ts.SourceFile, program: ts.Program): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined {
  const typeChecker = program.getTypeChecker();
  if (isTypeConstImportExpression(node)) {
    return;
  }
  if (!isTypeConstCallExpression(node, typeChecker)) {
    return node;
  }
  if (!node.typeArguments) {
    return ts.createNull();
  }
  const type = typeChecker.getTypeFromTypeNode(node.typeArguments[0]);
  if (!type.isLiteral()) {
    return ts.createNull();
  }
  return ts.createLiteral(type.value);
}

const indexJs = path.join(__dirname, "index.js");
function isTypeConstImportExpression(
  node: ts.Node
): node is ts.ImportDeclaration {
  if (!ts.isImportDeclaration(node)) {
    return false;
  }
  const module = (node.moduleSpecifier as ts.StringLiteral).text;
  return module === "@ganache/ts-transformer-type-const";
}

const indexTs = path.join(__dirname, "index.d.ts");
function isTypeConstCallExpression(
  node: ts.Node,
  typeChecker: ts.TypeChecker
): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const signature = typeChecker.getResolvedSignature(node);
  if (typeof signature === "undefined") {
    return false;
  }
  const { declaration } = signature;
  return (
    !!declaration &&
    !ts.isJSDocSignature(declaration) &&
    require.resolve(declaration.getSourceFile().fileName) === indexTs &&
    declaration.name?.getText() === "constToValue"
  );
}
