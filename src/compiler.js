import AV from "./assignment-visitor.js"
import FastPath from "./fast-path.js"
import IEV from "./import-export-visitor.js"
import Parser from "./parser.js"

import createOptions from "./util/create-options.js"

const defaultOptions = {
  cjs: false,
  ext: false,
  runtimeAlias: "_",
  type: "module",
  var: false
}

const assignmentVisitor = new AV
const importExportVisitor = new IEV
const codeOfPound = "#".charCodeAt(0)
const shebangRegExp = /^#!.*/
const useModuleRegExp = /(["'])use module\1/

// Matches any import or export identifier as long as it's not preceded by a "."
// character (e.g. runtime.export) to prevent the compiler from compiling code
// it has already compiled.
const importExportRegExp = /(?:^|[^.]\b)(?:im|ex)port\b/

class Compiler {
  static compile(code, options) {
    options = createOptions(options, defaultOptions)

    if (code.charCodeAt(0) === codeOfPound) {
      code = code.replace(shebangRegExp, "")
    }

    const result = {
      code,
      data: null,
      type: "script"
    }

    if (options.type === "unambiguous" &&
        ! importExportRegExp.test(code) &&
        ! useModuleRegExp.test(code)) {
      return result
    }

    const rootPath = new FastPath(Parser.parse(code, {
      allowReturnOutsideFunction: options.cjs,
      enableExportExtensions: options.ext,
      enableImportExtensions: options.ext
    }))

    importExportVisitor.visit(rootPath, code, {
      generateVarDeclarations: options.var,
      runtimeAlias: options.runtimeAlias
    })

    if (importExportVisitor.madeChanges) {
      assignmentVisitor.visit(rootPath, {
        exportedLocalNames: importExportVisitor.exportedLocalNames,
        importedLocalNames: importExportVisitor.importedLocalNames,
        magicString: importExportVisitor.magicString,
        runtimeAlias: importExportVisitor.runtimeAlias
      })

      importExportVisitor.finalizeHoisting()
    }

    if (options.type !== "unambiguous" || importExportVisitor.madeChanges) {
      result.type = "module"
    }

    result.code = importExportVisitor.magicString.toString()
    return result
  }
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
