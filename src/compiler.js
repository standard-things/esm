import FastPath from "./fast-path.js"
import Parser from "./parser.js"

import assignmentVisitor from "./visitor/assignment.js"
import findIndexes from "./parse/find-indexes.js"
import hasPragma from "./parse/has-pragma.js"
import identifierVisitor from "./visitor/identifier.js"
import importExportVisitor from "./visitor/import-export.js"
import keys from "./util/keys.js"
import stripShebang from "./util/strip-shebang.js"
import toNullObject from "./util/to-null-object.js"

const defaultOptions = {
  __proto__: null,
  cjs: {
    cache: false,
    extensions: false,
    interop: false,
    namedExports: false,
    paths: false,
    topLevelReturn: false,
    vars: false
  },
  hint: "script",
  runtimeName: "_",
  strict: void 0,
  type: "script",
  var: false,
  warnings: (process.env && process.env.NODE_ENV) !== "production"
}

/* eslint-disable sort-keys */
const Compiler = {
  __proto__: null,
  createOptions,
  defaultOptions,
  compile(code, options) {
    code = stripShebang(code)
    options = Compiler.createOptions(options)

    const result = {
      changed: false,
      code,
      dependencySpecifiers: null,
      esm: false,
      exportNames: null,
      exportSpecifiers: null,
      exportStars: null,
      scriptData: null,
      warnings: null
    }

    let { hint, type } = options

    if (type === "unambiguous" &&
        hasPragma(code, "use script")) {
      type = "script"
    }

    if (type === "unambiguous" &&
        (hint === "module" ||
         hasPragma(code, "use module"))) {
      type = "module"
    }

    const possibleIndexes = findIndexes(code, ["export", "eval", "import"])

    if ((type === "script" ||
         type === "unambiguous") &&
        ! possibleIndexes.length) {
      return result
    }

    let ast
    let error
    let threw = true

    const allowReturnOutsideFunction =
      options.cjs.topLevelReturn ||
      type === "script"

    const sourceType = type === "script" ? type : "module"

    const parserOptions = {
      allowReturnOutsideFunction,
      sourceType,
      strict: options.strict
    }

    try {
      ast = Parser.parse(code, parserOptions)
      threw = false
    } catch (e) {
      error = e
      error.sourceType = parserOptions.sourceType
    }

    if (threw &&
        type === "unambiguous") {
      type = parserOptions.sourceType = "script"

      try {
        ast = Parser.parse(code, parserOptions)
        threw = false
      } catch (e) {}
    }

    if (threw) {
      throw error
    }

    const rootPath = new FastPath(ast)
    const { runtimeName } = options
    const { top } = ast

    try {
      importExportVisitor.visit(rootPath, code, {
        esm: type !== "script",
        generateVarDeclarations: options.var,
        possibleIndexes,
        runtimeName
      })
    } catch (e) {
      e.sourceType = parserOptions.sourceType
      throw e
    }

    result.changed = importExportVisitor.changed

    if (importExportVisitor.addedImportExport ||
        importExportVisitor.addedImportMeta) {
      type = "module"

      const { assignableExports, assignableImports } = importExportVisitor

      const possibleIndexes = findIndexes(code, [
        "eval",
        ...keys(assignableExports),
        ...keys(assignableImports)
      ])

      if (possibleIndexes.length) {
        try {
          assignmentVisitor.visit(rootPath, {
            assignableExports,
            assignableImports,
            magicString: importExportVisitor.magicString,
            possibleIndexes,
            runtimeName
          })
        } catch (e) {
          e.sourceType = parserOptions.sourceType
          throw e
        }
      }

      importExportVisitor.finalizeHoisting()
    }

    if (type === "module") {
      result.esm = true
      result.dependencySpecifiers = importExportVisitor.dependencySpecifiers
      result.exportNames = importExportVisitor.exportNames
      result.exportStars = importExportVisitor.exportStars

      if (options.warnings &&
          ! options.cjs.vars &&
          top.idents.indexOf("arguments") === -1) {
        const possibleIndexes = findIndexes(code, ["arguments"])

        if (possibleIndexes.length) {
          result.warnings = []
          identifierVisitor.visit(rootPath, {
            magicString: importExportVisitor.magicString,
            possibleIndexes,
            warnings: result.warnings
          })
        }
      }
    }

    if (result.changed) {
      result.code = importExportVisitor.magicString.toString()
    }

    return result
  }
}

function createOptions(options) {
  return toNullObject(options, Compiler.defaultOptions)
}

export default Compiler
