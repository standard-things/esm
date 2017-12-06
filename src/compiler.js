import FastPath from "./fast-path.js"
import Parser from "./parser.js"
import PkgInfo from "./pkg-info.js"

import _createOptions from "./util/create-options.js"
import assignmentVisitor from "./visitor/assignment.js"
import hasPragma from "./parse/has-pragma.js"
import identifierVisitor from "./visitor/identifier.js"
import importExportVisitor from "./visitor/import-export.js"
import stripShebang from "./util/strip-shebang.js"

const defaultOptions = {
  cjs: PkgInfo.defaultOptions.cjs,
  hint: "script",
  runtimeName: "_",
  type: "script",
  var: false,
  warnings: process.env.NODE_ENV !== "production"
}

const argumentsRegExp = /\barguments\b/
const importExportRegExp = /\b(?:im|ex)port\b/

class Compiler {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  static compile(code, options) {
    code = stripShebang(code)
    options = Compiler.createOptions(options)

    let { hint, type } = options

    const result = {
      code,
      data: null,
      esm: false,
      warnings: null
    }

    if (type === "unambiguous" &&
        hasPragma(code, "use script")) {
      type = "script"
    }

    if (type === "unambiguous" &&
        (hint === "module" || hasPragma(code, "use module"))) {
      type = "module"
    }

    if ((type === "script" || type === "unambiguous") &&
        ! importExportRegExp.test(code)) {
      return result
    }

    let ast
    let error
    let threw = true

    const allowReturnOutsideFunction =
      options.cjs.topLevelReturn ||
      type === "script"

    const sourceType = type === "script" ? type : "module"
    const parserOptions = { allowReturnOutsideFunction, sourceType }

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

    importExportVisitor.visit(rootPath, code, {
      esm: type !== "script",
      generateVarDeclarations: options.var,
      runtimeName
    })

    if (importExportVisitor.addedImportExport) {
      if (type === "unambiguous") {
        type = "module"
      }

      assignmentVisitor.visit(rootPath, {
        exportedLocalNames: importExportVisitor.exportedLocalNames,
        importedLocalNames: importExportVisitor.importedLocalNames,
        magicString: importExportVisitor.magicString,
        runtimeName
      })

      importExportVisitor.finalizeHoisting()
    }

    if (type === "module") {
      result.esm = true

      if (options.warnings &&
          ! options.cjs.vars &&
          argumentsRegExp.test(code)) {
        result.warnings = []
        identifierVisitor.visit(rootPath, {
          magicString: importExportVisitor.magicString,
          warnings: result.warnings
        })
      }
    }

    result.code = importExportVisitor.magicString.toString()
    return result
  }
}

function createOptions(options) {
  return _createOptions(options, Compiler.defaultOptions)
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
