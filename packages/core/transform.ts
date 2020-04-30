import * as ts from 'typescript'
import { resolve, dirname } from 'path'

type JSONValue = string | number | boolean | JSONObject | JSONArray

interface JSONObject {
    [x: string]: JSONValue
}

interface JSONArray extends Array<JSONValue> {}

function serializeToAst(v: JSONValue): ts.Expression {
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

function serializeToTypeAst(v: JSONValue): ts.TypeNode {
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

function resolveJsonImportFromNode(node: ts.ImportDeclaration | ts.ExportDeclaration, sf: ts.SourceFile): string {
    const jsonPath = trimQuote(node.moduleSpecifier.getText(sf))
    return jsonPath && resolveJsonImport(resolve(dirname(sf.fileName), jsonPath))
}

export interface Opts {
    isDeclaration?: boolean
}
const set = new Set();
function inlineJson (node: ts.ImportDeclaration | ts.ExportDeclaration, sf: ts.SourceFile, jsonPath: string, isDeclaration: boolean): ts.Node {
    const json = require(jsonPath)
    // Default import, inline the whole json
    // and convert it to const foo = {json}
    let value: ts.VariableDeclarationList
    let namespaceImport: ts.NamespaceImport | ts.NamespaceExportDeclaration
    let namedImports: ts.NamedImports | ts.NamedExports
    const isExportDeclaration = ts.isExportDeclaration(node)
    if (ts.isImportDeclaration(node)) {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            namespaceImport = node.importClause.namedBindings
        } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            namedImports = node.importClause.namedBindings
        }
    } else if (isExportDeclaration) {
        namedImports = node.exportClause as any
    }
    if (namespaceImport) {
        value = ts.createVariableDeclarationList([
            ts.createVariableDeclaration(
                namespaceImport.name.getText(sf),
                isDeclaration && serializeToTypeAst(json),
                !isDeclaration ? serializeToAst(json) : undefined
            ),
        ])
    }
    if (namedImports) {
        // Create alias in case we have alias import
        const aliases: Record<string, string> = (namedImports.elements as ReadonlyArray<ts.ImportSpecifier | ts.ExportSpecifier>).reduce((all: Record<string, string>, el) => {
            if (el.propertyName) {
                all[el.propertyName.getText(sf)] = el.name.getText(sf)
            } else {
                all[el.name.getText(sf)] = el.name.getText(sf)
            }
            return all
        }, {})
        value = ts.createVariableDeclarationList(
            Object.keys(aliases).map(k => ts.createVariableDeclaration(aliases[k], isDeclaration && serializeToTypeAst(json[k]), !isDeclaration ? serializeToAst(json[k]) : undefined))
        )
    }
    return ts.createVariableStatement([
        ...isExportDeclaration ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : [],
        isDeclaration ? ts.createModifier(ts.SyntaxKind.DeclareKeyword) : ts.createModifier(ts.SyntaxKind.ConstKeyword)
    ], value)
}

function visitor({isDeclaration}: Opts, ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        let jsonPath: string
        if (ts.isImportDeclaration(node) && (jsonPath = resolveJsonImportFromNode(node, sf))) {
            // If it has no import class (e.g import 'foo'), rm the node
            if (!node.importClause) {
                return null
            }
            return inlineJson(node, sf, jsonPath, isDeclaration) || ts.visitEachChild(node, visitor, ctx)
        }
        if (ts.isExportDeclaration(node) && node.moduleSpecifier && (jsonPath = resolveJsonImportFromNode(node, sf))) {
            return inlineJson(node, sf, jsonPath, isDeclaration) || ts.visitEachChild(node, visitor, ctx)
        }
        if (node.kind === 75) {
            console.log(node.modifiers);
        }
        return ts.visitEachChild(node, visitor, ctx)
    }

    return visitor
}

export function transform(opts: Opts): ts.TransformerFactory<ts.SourceFile> {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (sf: ts.SourceFile) => ts.visitNode(sf, visitor(opts, ctx, sf))
    }
}