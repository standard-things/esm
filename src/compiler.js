import SOURCE_TYPE from "./constant/source-type.js"

import FastPath from "./fast-path.js"
import MagicString from "./magic-string.js"
import Parser from "./parser.js"

import argumentsVisitor from "./visitor/arguments.js"
import assignmentVisitor from "./visitor/assignment.js"
import evalVisitor from "./visitor/eval.js"
import defaults from "./util/defaults.js"
import findIndexes from "./parse/find-indexes.js"
import globalsVisitor from "./visitor/globals.js"
import hasPragma from "./parse/has-pragma.js"
import importExportVisitor from "./visitor/import-export.js"
import isObjectEmpty from "./util/is-object-empty.js"
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

  // Add "main" to compiled code to enable the `readFileFast()` fast path of
  // `process.binding("fs").internalModuleReadJSON()`.
  const FAST_READ_PREFIX = '"main";'

  const defaultOptions = {
    cjsVars: false,
    generateVarDeclarations: false,
    hint: SCRIPT,
    pragmas: true,
    runtimeName: "_",
    sourceType: SCRIPT,
    strict: void 0,
    topLevelReturn: false
  }

  const Compiler = {
    createOptions,
    defaultOptions,
    // eslint-disable-next-line sort-keys
    compile(code, options) {
      code = stripShebang(code)
      options = Compiler.createOptions(options)

      argumentsVisitor.reset()
      assignmentVisitor.reset()
      evalVisitor.reset()
      globalsVisitor.reset()
      importExportVisitor.reset()
      temporalVisitor.reset()

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

      const { globals } = globalsVisitor
      const possibleGlobalsNames = keys(globals)

      const possibleExportIndexes = findIndexes(code, ["export"])
      const possibleEvalIndexes = findIndexes(code, ["eval"])
      const possibleGlobalsIndexes = findIndexes(code, possibleGlobalsNames)
      const possibleIndexes = findIndexes(code, ["import"])

      const possibleChanges = !! (
        possibleExportIndexes.length ||
        possibleEvalIndexes.length ||
        possibleGlobalsIndexes.length ||
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

      const parserOptions = {
        allowReturnOutsideFunction: options.topLevelReturn || sourceType === SCRIPT,
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
        parserOptions.allowReturnOutsideFunction = true

        sourceType =
        parserOptions.sourceType = SCRIPT

        try {
          ast = Parser.parse(code, parserOptions)
          threw = false
        } catch {}
      }

      if (threw) {
        throw error
      }

      const { strict, top } = ast
      const { identifiers, importedBindings } = top
      const { runtimeName } = options

      Reflect.deleteProperty(ast, "top")

      const magicString = new MagicString(code)
      const rootPath = new FastPath(ast)

      let yieldIndex = top.insertIndex

      possibleIndexes.push(...possibleExportIndexes)
      possibleIndexes.sort()

      try {
        importExportVisitor.visit(rootPath, {
          generateVarDeclarations: options.generateVarDeclarations,
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

      const { addedImportExport } = importExportVisitor

      if (addedImportExport ||
          importExportVisitor.addedImportMeta) {
        sourceType = MODULE
      }

      if (possibleGlobalsIndexes.length) {
        for (const name of possibleGlobalsNames) {
          if (Reflect.has(identifiers, name)) {
            Reflect.deleteProperty(globals, name)
          }
        }

        if (! isObjectEmpty(globals)) {
          globalsVisitor.visit(rootPath, {
            globals,
            magicString,
            possibleIndexes: possibleGlobalsIndexes,
            runtimeName
          })
        }
      }

      if (possibleEvalIndexes.length &&
          ! Reflect.has(identifiers, "eval")) {
        evalVisitor.visit(rootPath, {
          addedImportExport,
          magicString,
          possibleIndexes: possibleEvalIndexes,
          runtimeName,
          strict
        })
      }

      if (addedImportExport) {
        const { assignableBindings } = importExportVisitor

        const possibleIndexes = findIndexes(code, [
          ...keys(importedBindings),
          ...keys(assignableBindings)
        ])

        if (possibleIndexes.length) {
          try {
            assignmentVisitor.visit(rootPath, {
              assignableBindings,
              importedBindings,
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
          const { initedBindings, temporalBindings } = importExportVisitor

          result.enforceTDZ = () => {
            const possibleIndexes = findIndexes(code, keys(temporalBindings))

            possibleIndexes.push(...possibleExportIndexes)
            possibleIndexes.sort()

            result.enforceTDZ = noop

            temporalVisitor.visit(rootPath, {
              initedBindings,
              magicString,
              possibleIndexes,
              runtimeName,
              temporalBindings
            })

            if (temporalVisitor.changed) {
              result.code = FAST_READ_PREFIX + magicString.toString()
            }
          }
        }

        if (! options.cjsVars) {
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
            if (! Reflect.has(importedBindings, name)) {
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
          evalVisitor.changed ||
          globalsVisitor.changed ||
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
