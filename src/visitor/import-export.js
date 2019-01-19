import COMPILER from "../constant/compiler.js"

import Visitor from "../visitor.js"

import constructStackless from "../error/construct-stackless.js"
import encodeId from "../util/encode-id.js"
import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import keys from "../util/keys.js"
import { lineBreakRegExp } from "../acorn.js"
import overwrite from "../parse/overwrite.js"
import preserveChild from "../parse/preserve-child.js"
import preserveLine from "../parse/preserve-line.js"
import shared from "../shared.js"
import toStringLiteral from "../util/to-string-literal.js"

function init() {
  const {
    SOURCE_TYPE_MODULE
  } = COMPILER

  class ImportExportVisitor extends Visitor {
    finalizeHoisting() {
      const { top } = this
      const importBindings = keys(top.importedBindings)

      let code = top.insertPrefix

      if (importBindings.length !== 0) {
        code +=
          (this.generateVarDeclarations ? "var " : "let ") +
          importBindings.join(",") + ";"
      }

      code += toModuleExport(this, this.hoistedExports)

      const { importSpecifierMap, runtimeName } = this

      for (const request in importSpecifierMap) {
        code += runtimeName + ".w(" + toStringLiteral(request)

        let setterArgsList = ""

        const importedNames = keys(importSpecifierMap[request].imports)

        for (const importedName of importedNames) {
          const localNames = importSpecifierMap[request].imports[importedName]
          const valueParam = safeName("v", localNames)

          setterArgsList +=
            (setterArgsList === "" ? "" : ",") +
            '["' +
            importedName + '",' +
            (importedName === "*"
              ? "null"
              : '["' + localNames.join('","') + '"]'
            ) +
            ",function(" + valueParam + "){" +
            // Multiple local variables become a compound assignment.
            localNames.join("=") + "=" + valueParam +
            "}]"
        }

        const { reExports } = importSpecifierMap[request]
        const reExportedNames = keys(reExports)

        for (const reExportedName of reExportedNames) {
          const localNames = reExports[reExportedName]

          for (const localName of localNames) {
            setterArgsList +=
              (setterArgsList === "" ? "" : ",") +
              '["' +
              localName + '",null,' +
              runtimeName + '.f("' + localName + '","' + reExportedName +
              '")]'
          }
        }

        if (importSpecifierMap[request].star) {
          setterArgsList +=
            (setterArgsList === "" ? "" : ",") +
            '["*",null,' + runtimeName + ".n()]"
        }

        if (setterArgsList !== "") {
          code += ",[" + setterArgsList + "]"
        }

        code += ");"
      }

      this.magicString.prependLeft(top.insertIndex, code)
      this.yieldIndex += code.length
    }

    reset(options) {
      this.addedDynamicImport = false
      this.addedExport = false
      this.addedImport = false
      this.addedImportMeta = false
      this.assignableBindings = null
      this.changed = false
      this.firstLineBreakPos = -1
      this.generateVarDeclarations = false
      this.hoistedExports = null
      this.hoistedImportsString = ""
      this.importSpecifierMap = null
      this.initedBindings = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.sourceType = null
      this.strict = false
      this.temporalBindings = null
      this.top = null
      this.yieldIndex = 0

      if (options !== void 0) {
        const { magicString } = options

        this.assignableBindings = { __proto__: null }
        this.firstLineBreakPos = magicString.original.search(lineBreakRegExp)
        this.generateVarDeclarations = options.generateVarDeclarations
        this.hoistedExports = []
        this.importSpecifierMap = { __proto__: null }
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

      if (node.arguments.length === 0) {
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
      this.addedDynamicImport = true

      overwrite(this, callee.start, callee.end, this.runtimeName + ".i")
      path.call(this, "visitWithoutReset", "arguments")
    }

    visitImportDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
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
      this.changed = true
      this.addedImport = true

      const { importSpecifierMap, temporalBindings } = this
      const node = path.getValue()
      const request = node.source.value
      const { specifiers } = node

      if (! Reflect.has(importSpecifierMap, request)) {
        importSpecifierMap[request] = {
          __proto__: null,
          imports: { __proto__: null },
          reExports: { __proto__: null },
          star: false
        }
      }

      for (const specifier of specifiers) {
        const { type } = specifier

        let importedName

        if (type === "ImportSpecifier") {
          importedName = specifier.imported.name
        } else if (type === "ImportDefaultSpecifier") {
          importedName = "default"
        } else {
          importedName = "*"
        }

        if (! Reflect.has(importSpecifierMap[request].imports, importedName)) {
          importSpecifierMap[request].imports[importedName] = []
        }

        const localName = specifier.local.name

        importSpecifierMap[request].imports[importedName].push(localName)

        if (importedName !== "*") {
          temporalBindings[localName] = true
        }
      }

      hoistImports(this, node)
    }

    visitExportAllDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
        return
      }

      // Support re-exporting an imported module:
      // export * from "mod"
      this.changed = true
      this.addedExport = true

      const { importSpecifierMap } = this
      const node = path.getValue()
      const request = node.source.value

      if (! Reflect.has(importSpecifierMap, request)) {
        importSpecifierMap[request] = {
          __proto__: null,
          imports: { __proto__: null },
          reExports: { __proto__: null },
          star: false
        }
      }

      importSpecifierMap[request].star = true

      hoistImports(this, node)
    }

    visitExportDefaultDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
        return
      }

      this.changed = true
      this.addedExport = true

      const node = path.getValue()
      const { declaration } = node
      const { magicString, runtimeName } = this

      let { id, type } = declaration

      if (type === "ParenthesizedExpression") {
        const { expression } = declaration

        id = expression.id
        type = expression.type
      }

      if (id === void 0) {
        id = null
      }

      const name = id === null
        ? runtimeName + "anonymous"
        : id.name

      if ((id !== null &&
           type === "ClassDeclaration") ||
          type === "FunctionDeclaration") {
        // Support exporting default function declarations:
        // export default function named() {}
        if (id === null) {
          // Convert anonymous functions to hoisted named functions.
          magicString.prependLeft(declaration.functionParamsStart, " " + name)
        }

        hoistExports(this, node, [["default", name]])
      } else {
        // Support exporting other default declarations:
        // export default value
        let prefix = runtimeName + ".d("
        let suffix = ");"

        if (id === null &&
            (type === "ArrowFunctionExpression" ||
             type === "ClassDeclaration" ||
             type === "ClassExpression" ||
             type === "FunctionExpression")) {
          // Assign anonymous functions to a variable so they're given a
          // temporary name, which we'll rename later to "default".
          // https://tc39.github.io/ecma262/#sec-exports-runtime-semantics-evaluation
          prefix = "const " + name + "="
          suffix = ";" + runtimeName + ".d(" + name + ");"
        }

        if (type === "SequenceExpression") {
          // If the exported expression is a comma-separated sequence expression
          // it may not include the vital parentheses, so we should wrap the
          // expression with parentheses to make sure it's treated as a single
          // argument to `runtime.addDefaultValue()`, rather than as multiple
          // arguments.
          prefix += "("
          suffix = ")" + suffix
        }

        const localName = id === null
          ? runtimeName + ".o"
          : name

        this.hoistedExports.push(["default", localName])

        overwrite(this, node.start, declaration.start, "")
        overwrite(this, declaration.end, node.end, "")

        magicString
          .prependLeft(declaration.start, prefix)
          .prependRight(declaration.end, suffix)
      }

      if (id !== null) {
        this.assignableBindings[name] = true
      }

      this.initedBindings.default = isInitable(declaration)

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
        return
      }

      this.changed = true
      this.addedExport = true

      const {
        assignableBindings,
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

      const initees = { __proto__: null }

      if (declaration !== null) {
        const pairs = []
        const { type } = declaration
        const isClassDecl = type === "ClassDeclaration"

        let { id } = declaration

        if (id === void 0) {
          id = null
        }

        if (id !== null &&
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

          pairs.push([name, name])
        } else if (type === "VariableDeclaration") {
          const changeable = isChangeable(node)

          // Support exporting variable lists:
          // export let name1, name2, ..., nameN
          for (const { id, init } of declaration.declarations) {
            const initable = isInitable(init)
            const names = getNamesFromPattern(id)

            for (const name of names) {
              if (changeable) {
                assignableBindings[name] = true
              }

              if (! Reflect.has(initedBindings, name)) {
                if (initable) {
                  initees[name] = true
                  initedBindings[name] = true
                } else {
                  initedBindings[name] = false
                }
              }

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
            throw constructStackless(errors.SyntaxError, [
              {
                inModule: true,
                input: magicString.original
              },
              specifier.start,
              "Export '" + localName + "' is not defined in module"
            ])
          }

          if (! Reflect.has(initedBindings, localName)) {
            initees[exportedName] = true
            initedBindings[localName] = true
          }

          assignableBindings[localName] = true

          pairs.push([exportedName, localName])
        }

        hoistExports(this, node, pairs)
      } else {
        // Support re-exporting specifiers of an imported module:
        // export { name1, name2, ..., nameN } from "mod"
        const { importSpecifierMap } = this
        const request = source.value

        if (! Reflect.has(importSpecifierMap, request)) {
          importSpecifierMap[request] = {
            __proto__: null,
            imports: { __proto__: null },
            reExports: { __proto__: null },
            star: false
          }
        }

        for (const specifier of specifiers) {
          const exportedName = specifier.exported.name
          const localName = specifier.type === "ExportNamespaceSpecifier"
            ? "*"
            : specifier.local.name

          if (! Reflect.has(initees, exportedName)) {
            initees[exportedName] = true
          }

          const { reExports } = importSpecifierMap[request]

          if (! Reflect.has(reExports, exportedName)) {
            reExports[exportedName] = []
          }

          reExports[exportedName].push(localName)
        }

        hoistImports(this, node)
      }

      const initeeNames = keys(initees)

      if (initeeNames.length !== 0) {
        const { end } = declaration || node

        magicString.appendRight(
          end,
          ";" + runtimeName + ".j(" + JSON.stringify(initeeNames) + ");"
        )
      }

      if (declaration !== null) {
        path.call(this, "visitWithoutReset", "declaration")
      }
    }

    visitMetaProperty(path) {
      const { meta } = path.getValue()

      if (meta.name === "import") {
        // Support import.meta.
        this.changed = true
        this.addedImportMeta = true

        overwrite(this, meta.start, meta.end, this.runtimeName + "._")
      }
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

  function hoistImports(visitor, node) {
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

  function isInitable(node) {
    if (node === null) {
      return true
    }

    const { type } = node

    return type === "CallExpression" ||
      type === "Identifier" ||
      type === "MemberExpression" ||
      type === "SequenceExpression"
  }

  function safeName(name, localNames) {
    return localNames.indexOf(name) === -1
      ? name
      : safeName(encodeId(name), localNames)
  }

  function toModuleExport(visitor, pairs) {
    let code = ""

    const { length } = pairs

    if (length === 0) {
      return code
    }

    const lastIndex = length - 1

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
