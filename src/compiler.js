import FastPath from "./fast-path.js"
import NullObject from "./null-object.js"
import Parser from "./parser.js"
import PkgInfo from "./pkg-info.js"

import _createOptions from "./util/create-options.js"
import assignmentVisitor from "./visitor/assignment.js"
import has from "./util/has.js"
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
  warnings: (process.env && process.env.NODE_ENV) !== "production"
}

const argumentsRegExp = /\barguments\b/
const importExportRegExp = /\b(?:im|ex)port\b/

class Compiler {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  static compile(code, options) {
    code = stripShebang(code)
    options = Compiler.createOptions(options)

    const { runtimeName } = options
    const result = new NullObject

    result.code = code
    result.runtimeName = runtimeName

    result.changed =
    result.esm = false

    result.exportSpecifiers =
    result.exportStarNames =
    result.moduleSpecifiers =
    result.warnings = null

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

    if ((type === "script" ||
         type === "unambiguous") &&
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
    const top = rootPath.stack[0].top

    try {
      importExportVisitor.visit(rootPath, code, {
        esm: type !== "script",
        generateVarDeclarations: options.var,
        runtimeName
      })
    } catch (e) {
      e.sourceType = parserOptions.sourceType
      throw e
    }

    result.changed = importExportVisitor.changed

    if (importExportVisitor.addedImportExport) {
      if (type === "unambiguous") {
        type = "module"
      }

      try {
        assignmentVisitor.visit(rootPath, {
          assignableExports: importExportVisitor.assignableExports,
          assignableImports: importExportVisitor.assignableImports,
          magicString: importExportVisitor.magicString,
          runtimeName
        })
      } catch (e) {
        e.sourceType = parserOptions.sourceType
        throw e
      }

      importExportVisitor.finalizeHoisting()
    }

    if (type === "module") {
      const { moduleSpecifiers } = importExportVisitor
      const specifierMap = new NullObject

      for (const specifier in moduleSpecifiers) {
        const exportNames =
        specifierMap[specifier] = []

        const moduleSpecifier = moduleSpecifiers[specifier]

        for (const exportName in moduleSpecifier) {
          if (exportName !== "*" &&
              has(moduleSpecifier, exportName)) {
            exportNames.push(exportName)
          }
        }
      }

      result.esm = true
      result.exportSpecifiers = importExportVisitor.exportSpecifiers
      result.exportStarNames = importExportVisitor.exportStarNames
      result.moduleSpecifiers = specifierMap

      if (options.warnings &&
          ! options.cjs.vars &&
          top.idents.indexOf("arguments") === -1 &&
          argumentsRegExp.test(code)) {
        result.warnings = []
        identifierVisitor.visit(rootPath, {
          magicString: importExportVisitor.magicString,
          warnings: result.warnings
        })
      }
    }

    if (result.changed) {
      result.code = importExportVisitor.magicString.toString()
    }

    return result
  }
}

function createOptions(options) {
  return _createOptions(options, Compiler.defaultOptions)
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
