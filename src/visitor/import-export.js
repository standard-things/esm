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
        toModuleImport(this, this.specifierMap)

      this.magicString.prependLeft(top.insertIndex, code)
      this.yieldIndex += code.length
    }

    reset(options) {
      this.addedImportExport = false
      this.addedImportMeta = false
      this.assignableExports = null
      this.changed = false
      this.dependencySpecifiers = null
      this.exportedFrom = null
      this.exportedNames = null
      this.exportedStars = null
      this.firstLineBreakPos = -1
      this.generateVarDeclarations = false
      this.hoistedExports = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.sourceType = null
      this.specifierMap = null
      this.strict = false
      this.temporals = null
      this.top = null
      this.yieldIndex = 0

      if (options) {
        const { magicString } = options

        this.assignableExports = { __proto__: null }
        this.dependencySpecifiers = { __proto__: null }
        this.exportedFrom = { __proto__: null }
        this.exportedNames = []
        this.exportedStars = []
        this.firstLineBreakPos = magicString.original.search(lineBreakRegExp)
        this.generateVarDeclarations = options.generateVarDeclarations
        this.hoistedExports = []
        this.magicString = magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.sourceType = options.sourceType
        this.specifierMap = { __proto__: null }
        this.strict = options.strict
        this.temporals = { __proto__: null }
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
      const { specifierMap, temporals } = this
      const sourceName = node.source.value

      const importSpecifiers =
        specifierMap[sourceName] ||
        (specifierMap[sourceName] = { __proto__: null })

      addToDependencySpecifiers(this, sourceName)

      for (const specifier of node.specifiers) {
        const localName = specifier.local.name
        const { type } = specifier

        let importedName = "*"

        if (type === "ImportSpecifier") {
          importedName = specifier.imported.name
        } else if (type === "ImportDefaultSpecifier") {
          importedName = "default"
        }

        const types =
          importSpecifiers[importedName] ||
          (importSpecifiers[importedName] = {
            exported: [],
            imported: []
          })

        addToDependencySpecifiers(this, sourceName, importedName)

        if (importedName !== "*") {
          temporals[localName] = true
        }

        types.imported.push(localName)
      }

      preserveLine(this, node)
    }

    visitExportAllDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      // Support re-exporting an imported module:
      // export * from "mod"
      this.changed =
      this.addedImportExport = true

      const node = path.getValue()
      const { exportedFrom, specifierMap } = this
      const sourceName = node.source.value

      if (! exportedFrom[sourceName]) {
        exportedFrom[sourceName] = []
      }

      this.exportedStars.push(sourceName)
      addToDependencySpecifiers(this, sourceName)

      const importSpecifiers =
        specifierMap[sourceName] ||
        (specifierMap[sourceName] = { __proto__: null })

      const types =
        importSpecifiers["*"] ||
        (importSpecifiers["*"] = {
          exported: [],
          imported: []
        })

      types.exported.push("*")
      preserveLine(this, node)
    }

    visitExportDefaultDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      this.changed =
      this.addedImportExport = true

      this.exportedNames.push("default")

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

      const pairs = [["default", name]]

      if (type === "FunctionDeclaration" ||
          (id && type === "ClassDeclaration")) {
        // Support exporting default function declarations:
        // export default function named() {}
        if (! id) {
          // Convert anonymous functions to hoisted named functions.
          magicString.prependLeft(declaration.functionParamsStart, " " + name)
        }

        hoistExports(this, node, pairs)
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
        addAssignableExports(this, pairs)
      }

      magicString.appendRight(
        node.end,
        runtimeName + '.entry.updateBindings(["default"], true);'
      )

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      if (this.sourceType !== MODULE) {
        return
      }

      this.changed =
      this.addedImportExport = true

      const node = path.getValue()

      const {
        declaration,
        source
      } = node

      const updates = { __proto__: null }

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

          updates[name] = true
          pairs.push([name, name])
        } else if (type === "VariableDeclaration") {
          // Support exporting variable lists:
          // export let name1, name2, ..., nameN
          for (const { id } of declaration.declarations) {
            const names = getNamesFromPattern(id)

            for (const name of names) {
              updates[name] = true
              pairs.push([name, name])
            }
          }
        }

        hoistExports(this, node, pairs)

        // Skip adding declared names to `this.assignableExports()` if the
        // declaration is a const-kinded VariableDeclaration, because the
        // assignmentVisitor doesn't need to worry about changes to these
        // variables.
        if (canExportedValuesChange(node)) {
          addAssignableExports(this, pairs)
        }
      } else if (source === null) {
        // Support exporting specifiers:
        // export { name1, name2, ..., nameN }
        const { identifiers } = this.top
        const { original } =  this.magicString
        const pairs = []

        for (const specifier of node.specifiers) {
          const localName = specifier.local.name

          if (! Reflect.has(identifiers, localName)) {
            throw new errors.SyntaxError(
              original,
              specifier.start,
              "Export '" + localName + "' is not defined in module"
            )
          }

          updates[localName] = true
          pairs.push([specifier.exported.name, localName])
        }

        hoistExports(this, node, pairs)
        addAssignableExports(this, pairs)
      } else {
        // Support re-exporting specifiers of an imported module:
        // export { name1, name2, ..., nameN } from "mod"
        // export * as ns from "mod"
        const {
          exportedFrom,
          exportedNames,
          specifierMap
        } = this

        const sourceName = source.value

        const fromNames =
          exportedFrom[sourceName] ||
          (exportedFrom[sourceName] = [])

        const importSpecifiers =
          specifierMap[sourceName] ||
          (specifierMap[sourceName] = { __proto__: null })

        addToDependencySpecifiers(this, sourceName)

        for (const specifier of node.specifiers) {
          const exportedName = specifier.exported.name
          const localName = specifier.type === "ExportNamespaceSpecifier"
            ? "*"
            : specifier.local.name

          const types =
            importSpecifiers[localName] ||
            (importSpecifiers[localName] = {
              exported: [],
              imported: []
            })

          if (exportedName === localName) {
            fromNames.push([exportedName])
          } else {
            fromNames.push([exportedName, localName])
          }

          exportedNames.push(exportedName)
          types.exported.push(exportedName)
          addToDependencySpecifiers(this, sourceName, localName)
        }

        preserveLine(this, node)
      }

      const updateNames = keys(updates)

      if (updateNames.length) {
        const { end } = declaration || node

        this.magicString.appendRight(
          end,
          ";" + this.runtimeName + ".entry.updateBindings(" + JSON.stringify(updateNames) + ", true);"
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

  function addAssignableExports(visitor, pairs) {
    const { assignableExports } = visitor

    for (const [, localName] of pairs) {
      assignableExports[localName] = true
    }
  }

  function addToDependencySpecifiers(visitor, sourceName, exportedName) {
    const { dependencySpecifiers } = visitor

    const exportedNames =
      dependencySpecifiers[sourceName] ||
      (dependencySpecifiers[sourceName] = [])

    if (exportedName &&
        exportedName !== "*" &&
        exportedNames.indexOf(exportedName) === -1) {
      exportedNames.push(exportedName)
    }
  }

  function canExportedValuesChange({ declaration, type }) {
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

  function hoistExports(visitor, node, pairs) {
    visitor.hoistedExports.push(...pairs)

    if (node.declaration) {
      preserveChild(visitor, node, "declaration")
    } else {
      preserveLine(visitor, node)
    }
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

    const { exportedNames } = visitor
    const lastIndex = pairs.length - 1

    let i = -1

    code += visitor.runtimeName + ".x(["

    for (const [exportedName, localName] of pairs) {
      code +=
        '["' + exportedName + '",()=>' +
        localName +
        "]" +
        (++i === lastIndex ? "" : ",")

      exportedNames.push(exportedName)
    }

    code += "]);"

    return code
  }

  function toModuleImport(visitor, specifierMap) {
    const { runtimeName } = visitor

    let code = ""

    const varNames = []

    for (const sourceName in specifierMap) {
      const importSpecifiers = specifierMap[sourceName]
      const specifierNames = keys(importSpecifiers)

      for (const specifierName of specifierNames) {
        varNames.push(...importSpecifiers[specifierName].imported)
      }
    }

    if (varNames.length) {
      code +=
        (visitor.generateVarDeclarations ? "var " : "let ") +
        varNames.join(",") + ";"
    }

    for (const sourceName in specifierMap) {
      const importSpecifiers = specifierMap[sourceName]
      const specifierNames = keys(importSpecifiers)
      const { length } = specifierNames

      addToDependencySpecifiers(visitor, sourceName)

      code += runtimeName + '.w("' + sourceName + '"'

      if (! length) {
        code += ");"
        continue
      }

      const lastIndex = length - 1

      let i = -1

      code += ",["

      for (const specifierName of specifierNames) {
        const { exported, imported } = importSpecifiers[specifierName]
        const bindingNames = [...new Set([...exported, ...imported])]
        const importedLength = imported.length
        const entryParam = safeName("e", imported)
        const valueParam = safeName("v", imported)

        code +=
          '["' +
          specifierName + '",' +
          (specifierName === "*"
            ? "null"
            : '["' + bindingNames.join('","') + '"]'
          ) +
          ",function(" + valueParam + "," + entryParam + "){"

        if (importedLength) {
          // Multiple local variables become a compound assignment.
          code += imported.join("=") + "=" + valueParam
        }

        if (exported.length) {
          code +=
            (importedLength ? ";" : "") +
            exported
              .map((exportedName) =>
                exportedName === "*"
                  ? runtimeName + ".n(" + entryParam + ")"
                  : runtimeName + ".f(" + entryParam + ',"' + specifierName + '","' + exportedName + '")'
              )
              .join(";")
        }

        code +=
          "}]" +
          (++i === lastIndex ? "" : ",")
      }

      code += "]);"
    }

    return code
  }

  return new ImportExportVisitor
}

export default shared.inited
  ? shared.module.visitorImportExport
  : shared.module.visitorImportExport = init()
