import ENV from "./constant/env.js"
import SOURCE_TYPE from "./constant/source-type.js"

import FastPath from "./fast-path.js"
import MagicString from "./magic-string.js"
import Parser from "./parser.js"

import argumentsVisitor from "./visitor/arguments.js"
import assignmentVisitor from "./visitor/assignment.js"
import defaults from "./util/defaults.js"
import findIndexes from "./parse/find-indexes.js"
import hasPragma from "./parse/has-pragma.js"
import importExportVisitor from "./visitor/import-export.js"
import keys from "./util/keys.js"
import noop from "./util/noop.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import stripShebang from "./util/strip-shebang.js"
import temporalVisitor from "./visitor/temporal.js"

function init() {
  const {
    DEVELOPMENT
  } = ENV

  const {
    MODULE,
    SCRIPT,
    UNAMBIGUOUS
  } = SOURCE_TYPE

  const defaultOptions = {
    __proto__: null,
    assertTDZ: false,
    cjs: {
      cache: false,
      extensions: false,
      interop: false,
      namedExports: false,
      paths: false,
      topLevelReturn: false,
      vars: false
    },
    hint: SCRIPT,
    pragmas: true,
    runtimeName: "_",
    sourceType: SCRIPT,
    strict: void 0,
    var: false,
    warnings: DEVELOPMENT
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
        __proto__: null,
        changed: false,
        code,
        dependencySpecifiers: null,
        enforceTDZ: noop,
        exportNames: null,
        exportSpecifiers: null,
        exportStars: null,
        exportTemporals: null,
        scriptData: null,
        sourceType: SCRIPT,
        topLevelReturn: false,
        warnings: null
      }

      let { hint, sourceType } = options

      if (sourceType === UNAMBIGUOUS &&
          options.pragmas !== false) {
        if (hint === MODULE ||
            hasPragma(code, "use module")) {
          sourceType = MODULE
        } else if (hasPragma(code, "use script")) {
          sourceType = SCRIPT
        }
      }

      const possibleIndexes = findIndexes(code, ["export", "eval", "import"])

      let ast
      let error
      let threw = true

      if ((sourceType === SCRIPT ||
          sourceType === UNAMBIGUOUS) &&
          ! possibleIndexes.length) {
        return result
      }

      let allowReturnOutsideFunction =
        options.cjs.topLevelReturn ||
        sourceType === SCRIPT

      const parserOptions = {
        allowReturnOutsideFunction,
        sourceType: sourceType === SCRIPT ? SCRIPT : MODULE,
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
          sourceType === UNAMBIGUOUS) {
        allowReturnOutsideFunction =
        parserOptions.allowReturnOutsideFunction = true

        sourceType =
        parserOptions.sourceType = SCRIPT

        try {
          ast = Parser.parse(code, parserOptions)
          threw = false
        } catch (e) {}
      }

      if (threw) {
        throw error
      }

      const { strict, top } = ast
      const magicString = new MagicString(code)
      const rootPath = new FastPath(ast)
      const { runtimeName } = options

      Reflect.deleteProperty(ast, "top")

      result.topLevelReturn = top.returnOutsideFunction

      try {
        importExportVisitor.visit(rootPath, code, {
          __proto__: null,
          generateVarDeclarations: options.var,
          magicString,
          possibleIndexes,
          runtimeName,
          sourceType: sourceType === SCRIPT ? SCRIPT : MODULE,
          strict,
          top
        })
      } catch (e) {
        e.sourceType = parserOptions.sourceType
        throw e
      }

      result.changed = importExportVisitor.changed

      const {
        addedImportExport,
        importLocals
      } = importExportVisitor

      const importLocalNames = keys(importLocals)
      const possibleLocalIndexes = findIndexes(code, importLocalNames)

      if (addedImportExport ||
          importExportVisitor.addedImportMeta) {
        sourceType = MODULE

        const { assignableExports } = importExportVisitor

        const possibleIndexes = findIndexes(code, [
          "eval",
          ...keys(assignableExports)
        ])

        possibleIndexes.push(...possibleLocalIndexes)

        if (possibleIndexes.length) {
          possibleIndexes.sort()

          try {
            assignmentVisitor.visit(rootPath, {
              __proto__: null,
              assignableExports,
              importLocals,
              magicString,
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

      if (sourceType === UNAMBIGUOUS) {
        sourceType = SCRIPT
      } else if (sourceType === MODULE) {
        result.dependencySpecifiers = importExportVisitor.dependencySpecifiers
        result.exportNames = importExportVisitor.exportNames
        result.exportStars = importExportVisitor.exportStars
        result.exportTemporals = importExportVisitor.exportTemporals
        result.sourceType = MODULE

        if (addedImportExport) {
          result.enforceTDZ = () => {
            result.enforceTDZ = noop

            temporalVisitor.visit(rootPath, {
              __proto__: null,
              importLocals,
              magicString,
              possibleIndexes: possibleLocalIndexes,
              runtimeName
            })

            result.code = magicString.toString()
          }
        }

        if (options.warnings &&
            ! options.cjs.vars &&
            top.idents.indexOf("arguments") === -1) {
          const possibleIndexes = findIndexes(code, ["arguments"])

          if (possibleIndexes.length) {
            result.warnings = []
            argumentsVisitor.visit(rootPath, {
              __proto__: null,
              magicString,
              possibleIndexes,
              warnings: result.warnings
            })
          }
        }
      }

      if (result.changed) {
        setDeferred(result, "code", () => magicString.toString())
      }

      return result
    }
  }

  function createOptions(value) {
    return defaults({ __proto__: null }, value, Compiler.defaultOptions)
  }

  return Compiler
}

export default shared.inited
  ? shared.module.Compiler
  : shared.module.Compiler = init()
