import SOURCE_TYPE from "../constant/source-type.js"

import Visitor from "../visitor.js"

import encodeId from "../util/encode-id.js"
import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import keys from "../util/keys.js"
import { lineBreakRegExp } from "../acorn.js"
import overwrite from "../parse/overwrite.js"
import preserveChild from "../parse/preserve-child.js"
import preserveLine from "../parse/preserve-line.js"
import shared from "../shared.js"

function init() {
  const {
    MODULE
  } = SOURCE_TYPE

  class ImportExportVisitor extends Visitor {
    finalizeHoisting() {
      const { top } = this

      const code =
        top.insertPrefix +
        toModuleExport(this, this.hoistedExports) +
        this.hoistedImportsString

      this.magicString.prependLeft(top.insertIndex, code)
      this.yieldIndex += code.length
    }

    reset(options) {
      this.addedImportExport = false
      this.addedImportMeta = false
      this.assignableBindings = null
      this.changed = false
      this.dependencySpecifiers = null
      this.exportedFrom = null
      this.exportedNames = null
      this.exportedStars = null
      this.firstLineBreakPos = -1
      this.generateVarDeclarations = false
      this.hoistedExports = null
      this.hoistedImportsString = ""
      this.initedBindings = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.sourceType = null
      this.strict = false
      this.temporalBindings = null
      this.top = null
      this.yieldIndex = 0

      if (options) {
        const { magicString } = options

        this.assignableBindings = { __proto__: null }
        this.dependencySpecifiers = { __proto__: null }
        this.exportedFrom = { __proto__: null }
        this.exportedNames = []
        this.exportedStars = []
        this.firstLineBreakPos = magicString.original.search(lineBreakRegExp)
        this.generateVarDeclarations = options.generateVarDeclarations
        this.hoistedExports = []
        this.initedBindings = { __proto__: null }
        this.magicString = magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.sourceType = options.sourceType
        this.strict = options.strict
        this.temporalBindings = { __proto__: null }
        this.top = options.top
        this.yieldIndex = options.yieldIndex
      }
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (! node.arguments.length) {
        path.call(this, "visitWithoutReset", "callee")
        return
      }

      if (callee.type !== "Import") {
        this.visitChildren(path)
        return
      }

      // Support dynamic import:
      // import("mod")
      this.changed = true

      overwrite(this, callee.start, callee.end, this.runtimeName + ".i")
      path.call(this, "visitWithoutReset", "arguments")
    }

    visitImportDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      // Suport import statements:
      // import defaultName from "mod"
      // import * as name from "mod"
      // import { export as alias } from "mod"
      // import { export1 , export2, ...exportN } from "mod"
      // import { export1 , export2 as alias2, [...] } from "mod"
      // import defaultName, { export1, [ , [...] ] } from "mod"
      // import defaultName, * as name from "mod"
      // import "mod"
      this.changed =
      this.addedImportExport = true

      const node = path.getValue()
      const request = node.source.value
      const specifierMap = { __proto__: null }
      const { specifiers } = node
      const { temporalBindings } = this

      let code = ""
      let i = -1
      let lastIndex = specifiers.length - 1

      for (const specifier of specifiers) {
        const localName = specifier.local.name
        const { type } = specifier

        let importedName = "*"

        if (type === "ImportSpecifier") {
          importedName = specifier.imported.name
        } else if (type === "ImportDefaultSpecifier") {
          importedName = "default"
        }

        const localNames =
          specifierMap[importedName] ||
          (specifierMap[importedName] = [])

        localNames.push(localName)

        if (importedName !== "*") {
          temporalBindings[localName] = true
        }

        if (++i === 0) {
          code += (this.generateVarDeclarations ? "var " : "let ")
        }

        code +=
          localName +
          (i === lastIndex ? ";" : ",")
      }

      const importedNames = keys(specifierMap)
      const { length } = importedNames

      addToDependencySpecifiers(this, request)

      code += this.runtimeName + '.w("' + request + '"'

      if (length) {
        i = -1
        lastIndex = length - 1
        code += ",["

        for (const importedName of importedNames) {
          const localNames = specifierMap[importedName]
          const valueParam = safeName("v", localNames)

          code +=
            '["' +
            importedName + '",' +
            (importedName === "*"
              ? "null"
              : '["' + localNames.join('","') + '"]'
            ) +
            ",function(" + valueParam + "){" +
            // Multiple local variables become a compound assignment.
            localNames.join("=") + "=" + valueParam +
            "}]" +
            (++i === lastIndex ? "" : ",")

          addToDependencySpecifiers(this, request, importedName)
        }

        code += "]"
      }

      code += ");"

      hoistImports(this, node, code)
    }

    visitExportAllDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      // Support re-exporting an imported module:
      // export * from "mod"
      this.changed =
      this.addedImportExport = true

      const { exportedFrom, runtimeName } = this
      const node = path.getValue()
      const request = node.source.value

      const code =
        runtimeName + '.w("' + request +
        '",[["*",null,' + runtimeName + ".n()]]);"

      if (! exportedFrom[request]) {
        exportedFrom[request] = []
      }

      this.exportedStars.push(request)

      addToDependencySpecifiers(this, request)
      hoistImports(this, node, code)
    }

    visitExportDefaultDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      this.changed =
      this.addedImportExport = true

      const node = path.getValue()
      const { declaration } = node
      const { magicString, runtimeName } = this

      let { id, type } = declaration

      if (type === "ParenthesizedExpression") {
        const { expression } = declaration

        id = expression.id
        type = expression.type
      }

      const name = id
        ? id.name
        : runtimeName + "anonymous"

      if (type === "FunctionDeclaration" ||
          (id && type === "ClassDeclaration")) {
        // Support exporting default function declarations:
        // export default function named() {}
        if (! id) {
          // Convert anonymous functions to hoisted named functions.
          magicString.prependLeft(declaration.functionParamsStart, " " + name)
        }

        hoistExports(this, node, [["default", name]])
      } else {
        // Support exporting other default declarations:
        // export default value
        let prefix = runtimeName + ".d("
        let suffix = ");"

        if (! id &&
            (type === "ArrowFunctionExpression" ||
             type === "ClassDeclaration" ||
             type === "ClassExpression" ||
             type === "FunctionExpression")) {
          // Assign anonymous functions to a variable so they're given a
          // temporary name, which we'll rename later to "default".
          // https://tc39.github.io/ecma262/#sec-exports-runtime-semantics-evaluation
          prefix = "const " + name + "="
          suffix = ";" + runtimeName + ".d(" + name + ");"
        } else if (type === "SequenceExpression") {
          // If the exported expression is a comma-separated sequence expression
          // it may not include the vital parentheses, so we should wrap the
          // expression with parentheses to make sure it's treated as a single
          // argument to `runtime.default()`, rather than as multiple arguments.
          prefix += "("
          suffix = ")" + suffix
        }

        overwrite(this, node.start, declaration.start, "")
        overwrite(this, declaration.end, node.end, "")

        magicString
          .prependLeft(declaration.start, prefix)
          .prependRight(declaration.end, suffix)
      }

      if (id) {
        this.assignableBindings[name] = true
      }

      this.exportedNames.push("default")

      magicString.appendRight(
        node.end,
        runtimeName + '.j(["default"]);'
      )

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      this.changed =
      this.addedImportExport = true

      const {
        assignableBindings,
        exportedNames,
        initedBindings,
        magicString,
        runtimeName
      } = this

      const node = path.getValue()

      const {
        declaration,
        source,
        specifiers
      } = node

      const initBindings = { __proto__: null }

      if (declaration) {
        const pairs = []
        const { id, type } = declaration
        const isClassDecl = type === "ClassDeclaration"

        if (id &&
            (isClassDecl ||
             type === "FunctionDeclaration")) {
          // Support exporting named class and function declarations:
          // export function named() {}
          const { name } = id

          // Skip adding declared names to `this.assignableBindings` if the
          // declaration is a const-kinded VariableDeclaration, because the
          // assignmentVisitor doesn't need to worry about changes to these
          // variables.
          if (isChangeable(node)) {
            assignableBindings[name] = true
          }

          if (! initedBindings[name]) {
            initBindings[name] =
            initedBindings[name] = true
          }

          exportedNames.push(name)
          pairs.push([name, name])
        } else if (type === "VariableDeclaration") {
          const changeable = isChangeable(node)

          // Support exporting variable lists:
          // export let name1, name2, ..., nameN
          for (const { id } of declaration.declarations) {
            const names = getNamesFromPattern(id)

            for (const name of names) {
              if (changeable) {
                assignableBindings[name] = true
              }

              if (! initedBindings[name]) {
                initBindings[name] =
                initedBindings[name] = true
              }

              exportedNames.push(name)
              pairs.push([name, name])
            }
          }
        }

        hoistExports(this, node, pairs)
      } else if (source === null) {
        // Support exporting specifiers:
        // export { name1, name2, ..., nameN }
        const { identifiers } = this.top
        const pairs = []

        for (const specifier of specifiers) {
          const exportedName = specifier.exported.name
          const localName = specifier.local.name

          if (! Reflect.has(identifiers, localName)) {
            throw new errors.SyntaxError(
              magicString.original,
              specifier.start,
              "Export '" + localName + "' is not defined in module"
            )
          }

          if (! initedBindings[localName]) {
            initBindings[localName] =
            initedBindings[localName] = true
          }

          assignableBindings[localName] = true

          exportedNames.push(exportedName)
          pairs.push([exportedName, localName])
        }

        hoistExports(this, node, pairs)
      } else {
        // Support re-exporting specifiers of an imported module:
        // export { name1, name2, ..., nameN } from "mod"
        const { exportedFrom } = this
        const lastIndex = specifiers.length - 1
        const request = source.value

        const fromNames =
          exportedFrom[request] ||
          (exportedFrom[request] = [])

        let code = runtimeName + '.w("' + request + '"'
        let i = -1
        let setterArgsList = ""

        addToDependencySpecifiers(this, request)

        for (const specifier of specifiers) {
          const exportedName = specifier.exported.name
          const localName = specifier.type === "ExportNamespaceSpecifier"
            ? "*"
            : specifier.local.name

          setterArgsList +=
            '["' +
            localName + '",null,' +
            runtimeName + '.f("' + localName + '","' + exportedName +
            '")]' +
            (++i === lastIndex ? "" : ",")

          if (exportedName === localName) {
            fromNames.push([exportedName])
          } else {
            fromNames.push([exportedName, localName])
          }

          exportedNames.push(exportedName)

          addToDependencySpecifiers(this, request, localName)
        }

        code += ",[" + setterArgsList + "]);"

        hoistImports(this, node, code)
      }

      const initNames = keys(initBindings)

      if (initNames.length) {
        const { end } = declaration || node

        magicString.appendRight(
          end,
          ";" + runtimeName + ".j(" + JSON.stringify(initNames) + ");"
        )
      }

      if (declaration) {
        path.call(this, "visitWithoutReset", "declaration")
      }
    }

    visitMetaProperty(path) {
      const { meta } = path.getValue()

      if (meta.name === "import") {
        // Support import.meta.
        this.changed =
        this.addedImportMeta = true

        overwrite(this, meta.start, meta.end, this.runtimeName + "._")
      }
    }
  }

  function addToDependencySpecifiers(visitor, request, exportedName) {
    const { dependencySpecifiers } = visitor

    const exportedNames =
      dependencySpecifiers[request] ||
      (dependencySpecifiers[request] = [])

    if (exportedName &&
        exportedName !== "*" &&
        exportedNames.indexOf(exportedName) === -1) {
      exportedNames.push(exportedName)
    }
  }

  function hoistExports(visitor, node, pairs) {
    visitor.hoistedExports.push(...pairs)

    if (node.declaration) {
      preserveChild(visitor, node, "declaration")
    } else {
      preserveLine(visitor, node)
    }
  }

  function hoistImports(visitor, node, code) {
    visitor.hoistedImportsString += code
    preserveLine(visitor, node)
  }

  function isChangeable({ declaration, type }) {
    if (type === "ExportDefaultDeclaration") {
      const declType = declaration.type

      return declType === "FunctionDeclaration" ||
        declType === "ClassDeclaration"
    }

    if (type === "ExportNamedDeclaration" &&
        declaration &&
        declaration.type === "VariableDeclaration" &&
        declaration.kind === "const") {
      return false
    }

    return true
  }

  function safeName(name, localNames) {
    return localNames.indexOf(name) === -1
      ? name
      : safeName(encodeId(name), localNames)
  }

  function toModuleExport(visitor, pairs) {
    let code = ""

    if (! pairs.length) {
      return code
    }

    const lastIndex = pairs.length - 1

    let i = -1

    code += visitor.runtimeName + ".x(["

    for (const [exportedName, localName] of pairs) {
      code +=
        '["' + exportedName + '",()=>' +
        localName +
        "]" +
        (++i === lastIndex ? "" : ",")
    }

    code += "]);"

    return code
  }

  return new ImportExportVisitor
}

export default shared.inited
  ? shared.module.visitorImportExport
  : shared.module.visitorImportExport = init()
