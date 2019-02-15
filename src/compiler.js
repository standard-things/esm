import COMPILER from "./constant/compiler.js"

import FastPath from "./fast-path.js"
import MagicString from "./magic-string.js"
import Parser from "./parser.js"

import ascendingComparator from "./util/ascending-comparator.js"
import assignmentVisitor from "./visitor/assignment.js"
import evalVisitor from "./visitor/eval.js"
import defaults from "./util/defaults.js"
import findIndexes from "./parse/find-indexes.js"
import globalsVisitor from "./visitor/globals.js"
import hasPragma from "./parse/has-pragma.js"
import importExportVisitor from "./visitor/import-export.js"
import keys from "./util/keys.js"
import requireVisitor from "./visitor/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import stripShebang from "./util/strip-shebang.js"
import temporalVisitor from "./visitor/temporal.js"
import undeclaredVisitor from "./visitor/undeclared.js"

function init() {
  const {
    SOURCE_TYPE_MODULE,
    SOURCE_TYPE_SCRIPT,
    SOURCE_TYPE_UNAMBIGUOUS,
    TRANSFORMS_DYNAMIC_IMPORT,
    TRANSFORMS_EXPORT,
    TRANSFORMS_IMPORT,
    TRANSFORMS_IMPORT_META,
    TRANSFORMS_TEMPORALS
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

      assignmentVisitor.reset()
      evalVisitor.reset()
      globalsVisitor.reset()
      importExportVisitor.reset()
      requireVisitor.reset()
      temporalVisitor.reset()
      undeclaredVisitor.reset()

      const result = {
        circular: 0,
        code,
        codeWithTDZ: null,
        filename: null,
        firstAwaitOutsideFunction: null,
        mtime: -1,
        scriptData: null,
        sourceType: SOURCE_TYPE_SCRIPT,
        transforms: 0,
        yieldIndex: 0
      }

      let { sourceType } = options

      if (options.pragmas) {
        if (options.hint === SOURCE_TYPE_MODULE ||
            hasPragma(code, "use module")) {
          sourceType = SOURCE_TYPE_MODULE
        } else if (hasPragma(code, "use script")) {
          sourceType = SOURCE_TYPE_SCRIPT
        }
      }

      const possibleExportIndexes = findIndexes(code, ["export"])
      const possibleEvalIndexes = findIndexes(code, ["eval"])
      const possibleImportExportIndexes = findIndexes(code, ["import"])

      const possibleChanges =
        possibleExportIndexes.length !== 0 ||
        possibleEvalIndexes.length !== 0 ||
        possibleImportExportIndexes.length !== 0

      if (! possibleChanges &&
          (sourceType === SOURCE_TYPE_SCRIPT ||
           sourceType === SOURCE_TYPE_UNAMBIGUOUS)) {
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
        sourceType = SOURCE_TYPE_SCRIPT
        parserOptions.allowReturnOutsideFunction = true
        parserOptions.sourceType = sourceType

        try {
          ast = Parser.parse(code, parserOptions)
          threw = false
        } catch {}
      }

      if (threw) {
        throw error
      }

      const { strict, top } = ast
      const { runtimeName } = options
      const topIdentifiers = top.identifiers

      Reflect.deleteProperty(ast, "top")

      const magicString = new MagicString(code)
      const rootPath = new FastPath(ast)

      let yieldIndex = top.insertIndex

      possibleImportExportIndexes.push(...possibleExportIndexes)
      possibleImportExportIndexes.sort(ascendingComparator)

      importExportVisitor.visit(rootPath, {
        generateVarDeclarations: options.generateVarDeclarations,
        magicString,
        possibleIndexes: possibleImportExportIndexes,
        runtimeName,
        sourceType: sourceType === SOURCE_TYPE_SCRIPT ? SOURCE_TYPE_SCRIPT : SOURCE_TYPE_MODULE,
        strict,
        top,
        yieldIndex
      })

      const importExportTransforms = importExportVisitor.transforms
      const transformsDynamicImport = (importExportTransforms & TRANSFORMS_DYNAMIC_IMPORT) !== 0
      const transformsExport = (importExportTransforms & TRANSFORMS_EXPORT) !== 0
      const transformsImport = (importExportTransforms & TRANSFORMS_IMPORT) !== 0
      const transformsImportMeta = (importExportTransforms & TRANSFORMS_IMPORT_META) !== 0

      if (sourceType === SOURCE_TYPE_UNAMBIGUOUS) {
        if (transformsExport ||
            transformsImportMeta ||
            transformsImport) {
          sourceType = SOURCE_TYPE_MODULE
        } else {
          sourceType = SOURCE_TYPE_SCRIPT
        }
      }

      if (transformsDynamicImport ||
          transformsImport) {
        const globals = {
          __proto__: null,
          Reflect: true,
          console: true
        }

        const possibleGlobalsNames = []

        if (Reflect.has(topIdentifiers, "console")) {
          Reflect.deleteProperty(globals, "console")
        } else {
          possibleGlobalsNames.push("console")
        }

        if (Reflect.has(topIdentifiers, "Reflect")) {
          Reflect.deleteProperty(globals, "Reflect")
        } else {
          possibleGlobalsNames.push("Reflect")
        }

        globalsVisitor.visit(rootPath, {
          globals,
          magicString,
          possibleIndexes: findIndexes(code, possibleGlobalsNames),
          runtimeName
        })
      }

      if (! Reflect.has(topIdentifiers, "eval")) {
        evalVisitor.visit(rootPath, {
          magicString,
          possibleIndexes: possibleEvalIndexes,
          runtimeName,
          strict,
          transformUpdateBindings: transformsExport
        })
      }

      let possibleAssignableBindingsIndexes

      if (transformsExport ||
          transformsImport) {
        const { assignableBindings } = importExportVisitor

        possibleAssignableBindingsIndexes = findIndexes(code, keys(assignableBindings))

        if (options.cjsVars) {
          requireVisitor.visit(rootPath, {
            possibleIndexes: findIndexes(code, ["require"])
          })
        }

        const foundRequire = requireVisitor.found
        const { importedBindings } = top

        let possibleAssignmentIndexes = possibleAssignableBindingsIndexes

        if (! foundRequire) {
          possibleAssignmentIndexes = findIndexes(code, keys(importedBindings))
          possibleAssignmentIndexes.push(...possibleAssignableBindingsIndexes)
          possibleAssignmentIndexes.sort(ascendingComparator)
        }

        assignmentVisitor.visit(rootPath, {
          assignableBindings,
          importedBindings,
          magicString,
          possibleIndexes: possibleAssignmentIndexes,
          runtimeName,
          transformImportBindingAssignments: ! foundRequire,
          transformInsideFunctions: true
        })

        importExportVisitor.finalizeHoisting()
      }

      if (! options.cjsVars &&
          sourceType === SOURCE_TYPE_MODULE) {
        const undeclared = {
          __proto__: null,
          // eslint-disable-next-line sort-keys
          __dirname: true,
          __filename: true,
          arguments: true,
          exports: true,
          module: true,
          require: true
        }

        const undeclaredNames = []

        for (const name in undeclared) {
          if (Reflect.has(topIdentifiers, name)) {
            Reflect.deleteProperty(undeclared, name)
          } else {
            undeclaredNames.push(name)
          }
        }

        undeclaredVisitor.visit(rootPath, {
          magicString,
          possibleIndexes: findIndexes(code, undeclaredNames),
          runtimeName,
          undeclared
        })
      }

      result.transforms =
        evalVisitor.transforms |
        globalsVisitor.transforms |
        importExportTransforms |
        undeclaredVisitor.transforms

      if (result.transforms !== 0) {
        yieldIndex = importExportVisitor.yieldIndex

        result.code = magicString.toString()
      }

      if (transformsImport) {
        // Pick `importExportVisitor` properties outside of the `codeWithTDZ`
        // getter/setter to preserve their values.
        const { assignableBindings, temporalBindings } = importExportVisitor

        setDeferred(result, "codeWithTDZ", () => {
          const possibleTemporalIndexes = findIndexes(code, keys(temporalBindings))

          possibleTemporalIndexes.push(...possibleExportIndexes)
          possibleTemporalIndexes.sort(ascendingComparator)

          assignmentVisitor.visit(rootPath, {
            assignableBindings,
            magicString,
            possibleIndexes: possibleAssignableBindingsIndexes,
            runtimeName,
            transformOutsideFunctions: true
          })

          temporalVisitor.visit(rootPath, {
            magicString,
            possibleIndexes: possibleTemporalIndexes,
            runtimeName,
            temporalBindings
          })

          const temporalTransforms = temporalVisitor.transforms

          result.transforms |= temporalTransforms

          return (temporalTransforms & TRANSFORMS_TEMPORALS) === 0
            ? null
            : magicString.toString()
        })

        result.circular = -1
      }

      result.firstAwaitOutsideFunction = top.firstAwaitOutsideFunction
      result.sourceType = sourceType
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
