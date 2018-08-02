import SOURCE_TYPE from "./constant/source-type.js"

import FastPath from "./fast-path.js"
import MagicString from "./magic-string.js"
import Parser from "./parser.js"

import argumentsVisitor from "./visitor/arguments.js"
import assignmentVisitor from "./visitor/assignment.js"
import consoleVisitor from "./visitor/console.js"
import evalVisitor from "./visitor/eval.js"
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
    MODULE,
    SCRIPT,
    UNAMBIGUOUS
  } = SOURCE_TYPE

  // Add "main" to compiled code to enable the `readFileFast` fast path of
  // `process.binding("fs").internalModuleReadJSON`.
  const FAST_READ_PREFIX = '"main";'

  const defaultOptions = {
    cjs: {
      topLevelReturn: false,
      vars: false
    },
    hint: SCRIPT,
    pragmas: true,
    runtimeName: "_",
    sourceType: SCRIPT,
    strict: void 0,
    var: false
  }

  const Compiler = {
    createOptions,
    defaultOptions,
    // eslint-disable-next-line sort-keys
    compile(code, options) {
      code = stripShebang(code)
      options = Compiler.createOptions(options)

      const result = {
        changed: false,
        code,
        dependencySpecifiers: null,
        enforceTDZ: noop,
        exportedFrom: null,
        exportedNames: null,
        exportedSpecifiers: null,
        exportedStars: null,
        scriptData: null,
        sourceType: SCRIPT,
        yieldIndex: 0
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

      const possibleConsoleIndexes = findIndexes(code, ["console"])
      const possibleExportIndexes = findIndexes(code, ["export"])
      const possibleEvalIndexes = findIndexes(code, ["eval"])
      const possibleIndexes = findIndexes(code, ["import"])

      const possibleChanges = !! (
        possibleConsoleIndexes.length ||
        possibleExportIndexes.length ||
        possibleEvalIndexes.length ||
        possibleIndexes.length
      )

      let ast
      let error
      let threw = true

      if ((sourceType === SCRIPT ||
          sourceType === UNAMBIGUOUS) &&
          ! possibleChanges) {
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

      let yieldIndex = top.insertIndex

      possibleIndexes.push(...possibleExportIndexes)
      possibleIndexes.sort()

      Reflect.deleteProperty(ast, "top")

      argumentsVisitor.reset()
      assignmentVisitor.reset()
      consoleVisitor.reset()
      evalVisitor.reset()
      importExportVisitor.reset()
      temporalVisitor.reset()

      try {
        importExportVisitor.visit(rootPath, {
          generateVarDeclarations: options.var,
          magicString,
          possibleIndexes,
          runtimeName,
          sourceType: sourceType === SCRIPT ? SCRIPT : MODULE,
          strict,
          top,
          yieldIndex
        })
      } catch (e) {
        e.sourceType = parserOptions.sourceType
        throw e
      }

      const {
        addedImportExport,
        importedLocals,
        temporals
      } = importExportVisitor

      if (addedImportExport ||
          importExportVisitor.addedImportMeta) {
        sourceType = MODULE
      }

      if (possibleConsoleIndexes.length &&
          top.identifiers.indexOf("console") === -1) {
        consoleVisitor.visit(rootPath, {
          magicString,
          possibleIndexes: possibleConsoleIndexes,
          runtimeName
        })
      }

      if (possibleEvalIndexes.length &&
          top.identifiers.indexOf("eval") === -1) {
        evalVisitor.visit(rootPath, {
          addedImportExport,
          magicString,
          possibleIndexes: possibleEvalIndexes,
          runtimeName,
          strict
        })
      }

      if (addedImportExport) {
        const { assignableExports } = importExportVisitor

        const possibleIndexes = findIndexes(code, [
          ...keys(importedLocals),
          ...keys(assignableExports)
        ])

        if (possibleIndexes.length) {
          try {
            assignmentVisitor.visit(rootPath, {
              assignableExports,
              importedLocals,
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
        result.exportedFrom = importExportVisitor.exportedFrom
        result.exportedNames = importExportVisitor.exportedNames
        result.exportedStars = importExportVisitor.exportedStars
        result.sourceType = MODULE

        if (addedImportExport) {
          result.enforceTDZ = () => {
            result.enforceTDZ = noop

            const possibleIndexes = findIndexes(code, keys(temporals))

            possibleIndexes.push(...possibleExportIndexes)
            possibleIndexes.sort()

            temporalVisitor.visit(rootPath, {
              magicString,
              possibleIndexes,
              runtimeName,
              temporals
            })

            if (temporalVisitor.changed) {
              result.code = FAST_READ_PREFIX + magicString.toString()
            }
          }
        }

        if (! options.cjs.vars) {
          const { importedLocals } = top
          const possibleNames = []

          const names = [
            "__dirname",
            "__filename",
            "arguments",
            "exports",
            "module",
            "require"
          ]

          for (const name of names) {
            if (importedLocals.indexOf(name) === -1) {
              possibleNames.push(name)
            }
          }

          const possibleIndexes = findIndexes(code, possibleNames)

          if (possibleIndexes.length) {
            argumentsVisitor.visit(rootPath, {
              magicString,
              possibleIndexes,
              runtimeName,
              top
            })
          }
        }
      }

      if (argumentsVisitor.changed ||
          consoleVisitor.changed ||
          evalVisitor.changed ||
          importExportVisitor.changed) {
        result.changed = true

        yieldIndex =
          FAST_READ_PREFIX.length +
          importExportVisitor.yieldIndex

        setDeferred(result, "code", () => FAST_READ_PREFIX + magicString.toString())
      }

      result.yieldIndex = yieldIndex

      return result
    }
  }

  function createOptions(value) {
    return defaults({}, value, Compiler.defaultOptions)
  }

  return Compiler
}

export default shared.inited
  ? shared.module.Compiler
  : shared.module.Compiler = init()
