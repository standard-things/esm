import COMPILER from "./constant/compiler.js"

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
    SOURCE_TYPE_MODULE,
    SOURCE_TYPE_SCRIPT,
    SOURCE_TYPE_UNAMBIGUOUS
  } = COMPILER

  const defaultOptions = {
    cjsVars: false,
    generateVarDeclarations: false,
    hint: SOURCE_TYPE_SCRIPT,
    pragmas: true,
    runtimeName: "_",
    sourceType: SOURCE_TYPE_SCRIPT,
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
        enforceTDZ: noop,
        live: false,
        scriptData: null,
        sourceType: SOURCE_TYPE_SCRIPT,
        yieldIndex: 0
      }

      let { hint, sourceType } = options

      if (sourceType === SOURCE_TYPE_UNAMBIGUOUS &&
          options.pragmas !== false) {
        if (hint === SOURCE_TYPE_MODULE ||
            hasPragma(code, "use module")) {
          sourceType = SOURCE_TYPE_MODULE
        } else if (hasPragma(code, "use script")) {
          sourceType = SOURCE_TYPE_SCRIPT
        }
      }

      const possibleExportIndexes = findIndexes(code, ["export"])
      const possibleEvalIndexes = findIndexes(code, ["eval"])
      const possibleIndexes = findIndexes(code, ["import"])

      const possibleChanges = !! (
        possibleExportIndexes.length ||
        possibleEvalIndexes.length ||
        possibleIndexes.length
      )

      if ((sourceType === SOURCE_TYPE_SCRIPT ||
          sourceType === SOURCE_TYPE_UNAMBIGUOUS) &&
          ! possibleChanges) {
        return result
      }

      const parserOptions = {
        allowReturnOutsideFunction: options.topLevelReturn || sourceType === SOURCE_TYPE_SCRIPT,
        sourceType: sourceType === SOURCE_TYPE_SCRIPT ? SOURCE_TYPE_SCRIPT : SOURCE_TYPE_MODULE,
        strict: options.strict
      }

      let ast
      let error
      let threw = true

      try {
        ast = Parser.parse(code, parserOptions)
        threw = false
      } catch (e) {
        error = e
      }

      if (threw &&
          sourceType === SOURCE_TYPE_UNAMBIGUOUS) {
        parserOptions.allowReturnOutsideFunction = true

        sourceType =
        parserOptions.sourceType = SOURCE_TYPE_SCRIPT

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

      importExportVisitor.visit(rootPath, {
        generateVarDeclarations: options.generateVarDeclarations,
        magicString,
        possibleIndexes,
        runtimeName,
        sourceType: sourceType === SOURCE_TYPE_SCRIPT ? SOURCE_TYPE_SCRIPT : SOURCE_TYPE_MODULE,
        strict,
        top,
        yieldIndex
      })

      const {
        addedDynamicImport,
        addedExport,
        addedImportMeta,
        addedNamespaceImport,
        addedImport
      } = importExportVisitor

      if (addedExport ||
          addedImportMeta ||
          addedImport) {
        sourceType = SOURCE_TYPE_MODULE
      }

      if (addedDynamicImport ||
          addedNamespaceImport) {
        const { globals } = globalsVisitor
        const possibleGlobalsNames = keys(globals)
        const possibleGlobalsIndexes = findIndexes(code, possibleGlobalsNames)

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
      }

      if (possibleEvalIndexes.length &&
          ! Reflect.has(identifiers, "eval")) {
        evalVisitor.visit(rootPath, {
          addedExport,
          magicString,
          possibleIndexes: possibleEvalIndexes,
          runtimeName,
          strict
        })
      }

      if (addedExport ||
          addedImport) {
        const { assignableBindings } = importExportVisitor

        const possibleIndexes = findIndexes(code, [
          ...keys(importedBindings),
          ...keys(assignableBindings)
        ])

        if (possibleIndexes.length) {
          assignmentVisitor.visit(rootPath, {
            addedExport,
            addedImport,
            assignableBindings,
            importedBindings,
            magicString,
            possibleIndexes,
            runtimeName
          })
        }

        importExportVisitor.finalizeHoisting()
      }

      if (sourceType === SOURCE_TYPE_UNAMBIGUOUS) {
        sourceType = SOURCE_TYPE_SCRIPT
      } else if (sourceType === SOURCE_TYPE_MODULE) {
        result.sourceType = SOURCE_TYPE_MODULE

        if (addedImport) {
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
              result.code = magicString.toString()
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
        yieldIndex = importExportVisitor.yieldIndex
        setDeferred(result, "code", () =>  magicString.toString())
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
