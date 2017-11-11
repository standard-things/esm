import FastPath from "./fast-path.js"
import Parser from "./parser.js"

import _createOptions from "./util/create-options.js"
import assignmentVisitor from "./visitor/assignment.js"
import hasPragma from "./parse/has-pragma.js"
import identifierVisitor from "./visitor/identifier.js"
import importExportVisitor from "./visitor/import-export.js"
import stripShebang from "./util/strip-shebang.js"

const defaultOptions = {
  cjs: false,
  hint: "script",
  runtimeAlias: "_",
  type: "module",
  var: false,
  warnings: process.env.NODE_ENV !== "production"
}

const createOptions = (options) => _createOptions(options, Compiler.defaultOptions)

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

    const parserOptions = {
      allowReturnOutsideFunction: options.cjs.topLevelReturn,
      sourceType: type === "script" ? type : "module"
    }

    try {
      ast = Parser.parse(code, parserOptions)
      threw = false
    } catch (e) {
      error = e
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
    const { runtimeAlias } = options

    importExportVisitor.visit(rootPath, code, {
      esm: type !== "script",
      generateVarDeclarations: options.var,
      runtimeAlias
    })

    if (importExportVisitor.addedImportExport) {
      if (type === "unambiguous") {
        type = "module"
      }

      assignmentVisitor.visit(rootPath, {
        exportedLocalNames: importExportVisitor.exportedLocalNames,
        importedLocalNames: importExportVisitor.importedLocalNames,
        magicString: importExportVisitor.magicString,
        runtimeAlias
      })

      importExportVisitor.finalizeHoisting()
    }

    if (type === "module") {
      result.esm = true

      if (options.warnings &&
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

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
