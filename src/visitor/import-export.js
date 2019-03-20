import COMPILER from "../constant/compiler.js"

import Visitor from "../visitor.js"

import encodeId from "../util/encode-id.js"
import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import { lineBreakRegExp } from "../acorn.js"
import overwrite from "../parse/overwrite.js"
import preserveChild from "../parse/preserve-child.js"
import preserveLine from "../parse/preserve-line.js"
import shared from "../shared.js"
import toStringLiteral from "../util/to-string-literal.js"

function init() {
  const {
    SOURCE_TYPE_MODULE,
    TRANSFORMS_DYNAMIC_IMPORT,
    TRANSFORMS_EXPORT,
    TRANSFORMS_IMPORT,
    TRANSFORMS_IMPORT_META
  } = COMPILER

  class ImportExportVisitor extends Visitor {
    finalizeHoisting() {
      const { top } = this
      const { importedBindings } = top

      let code = top.insertPrefix

      if (importedBindings.size !== 0) {
        code +=
          (this.generateVarDeclarations ? "var " : "let ") +
          [...importedBindings].join(",") + ";"
      }

      code += toModuleExport(this, this.hoistedExports)

      const { runtimeName } = this

      this.importSpecifierMap.forEach((map, request) => {
        code += runtimeName + ".w(" + toStringLiteral(request)

        let setterArgsList = ""

        map.imports.forEach((localNames, name) => {
          const valueParam = safeName("v", localNames)

          setterArgsList +=
            (setterArgsList === ""
              ? ""
              : ","
            ) +
            '["' +
            name + '",' +
            (name === "*"
              ? "null"
              : '["' + localNames.join('","') + '"]'
            ) +
            ",function(" + valueParam + "){" +
            // Multiple local variables become a compound assignment.
            localNames.join("=") + "=" + valueParam +
            "}]"
        })

        map.reExports.forEach((localNames, name) => {
          for (const localName of localNames) {
            setterArgsList +=
              (setterArgsList === ""
                ? ""
                : ","
              ) +
              '["' +
              localName + '",null,' +
              runtimeName + '.f("' + localName + '","' + name +
              '")]'
          }
        })

        if (map.star) {
          setterArgsList +=
            (setterArgsList === ""
              ? ""
              : ","
            ) +
            '["*",null,' + runtimeName + ".n()]"
        }

        if (setterArgsList !== "") {
          code += ",[" + setterArgsList + "]"
        }

        code += ");"
      })

      this.magicString.prependLeft(top.insertIndex, code)
      this.yieldIndex += code.length
    }

    reset(options) {
      this.assignableBindings = null
      this.firstLineBreakPos = -1
      this.generateVarDeclarations = false
      this.hoistedExports = null
      this.hoistedImportsString = ""
      this.importSpecifierMap = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.sourceType = null
      this.temporalBindings = null
      this.top = null
      this.transforms = 0
      this.yieldIndex = 0

      if (options !== void 0) {
        const { magicString } = options

        this.assignableBindings = new Set
        this.firstLineBreakPos = magicString.original.search(lineBreakRegExp)
        this.generateVarDeclarations = options.generateVarDeclarations
        this.hoistedExports = []
        this.importSpecifierMap = new Map
        this.magicString = magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.sourceType = options.sourceType
        this.temporalBindings = new Set
        this.top = options.top
        this.yieldIndex = options.yieldIndex
      }
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (callee.type !== "Import") {
        this.visitChildren(path)
        return
      }

      if (node.arguments.length === 0) {
        return
      }

      // Support dynamic import:
      // import("mod")
      this.transforms |= TRANSFORMS_DYNAMIC_IMPORT

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
      this.transforms |= TRANSFORMS_IMPORT

      const { importSpecifierMap, temporalBindings } = this
      const node = path.getValue()
      const request = node.source.value
      const { specifiers } = node

      let map = importSpecifierMap.get(request)

      if (map === void 0) {
        map = createImportSpecifierMap()
        importSpecifierMap.set(request, map)
      }

      const { imports } = map

      for (const specifier of specifiers) {
        const { type } = specifier

        let importsName = "*"

        if (type === "ImportSpecifier") {
          importsName = specifier.imported.name
        } else if (type === "ImportDefaultSpecifier") {
          importsName = "default"
        }

        let localNames = imports.get(importsName)

        if (localNames === void 0) {
          localNames = []
          imports.set(importsName, localNames)
        }

        const localName = specifier.local.name

        localNames.push(localName)

        if (importsName !== "*") {
          temporalBindings.add(localName)
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
      this.transforms |= TRANSFORMS_EXPORT

      const { importSpecifierMap } = this
      const node = path.getValue()
      const request = node.source.value

      let map = importSpecifierMap.get(request)

      if (map === void 0) {
        map = createImportSpecifierMap()
        importSpecifierMap.set(request, map)
      }

      map.star = true

      hoistImports(this, node)
    }

    visitExportDefaultDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
        return
      }

      this.transforms |= TRANSFORMS_EXPORT

      const node = path.getValue()
      const { declaration } = node
      const { magicString, runtimeName } = this
      const { type } = declaration

      let { id } = declaration

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
        this.assignableBindings.add(name)
      }

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      if (this.sourceType !== SOURCE_TYPE_MODULE) {
        return
      }

      this.transforms |= TRANSFORMS_EXPORT

      const { assignableBindings, magicString } = this
      const node = path.getValue()

      const {
        declaration,
        source,
        specifiers
      } = node

      if (declaration !== null) {
        const pairs = []
        const { type } = declaration

        if (type === "ClassDeclaration" ||
            type === "FunctionDeclaration") {
          // Support exporting named class and function declarations:
          // export function named() {}
          const { name } = declaration.id

          assignableBindings.add(name)
          pairs.push([name, name])
        } else if (type === "VariableDeclaration") {
          // Skip adding declared names to `this.assignableBindings` if the
          // declaration is a const-kinded VariableDeclaration, because the
          // assignmentVisitor doesn't need to worry about changes to these
          // variables.
          const changeable = isChangeable(node)

          // Support exporting variable lists:
          // export let name1, name2, ..., nameN
          for (const { id } of declaration.declarations) {
            const names = getNamesFromPattern(id)

            for (const name of names) {
              if (changeable) {
                assignableBindings.add(name)
              }

              pairs.push([name, name])
            }
          }
        }

        hoistExports(this, node, pairs)
      } else if (source === null) {
        // Support exporting specifiers:
        // export { name1, name2, ..., nameN }
        const pairs = []
        const topIdentifiers = this.top.identifiers

        for (const specifier of specifiers) {
          const exportedName = specifier.exported.name
          const localName = specifier.local.name

          if (! topIdentifiers.has(localName)) {
            throw new errors.SyntaxError(
              {
                inModule: true,
                input: magicString.original
              },
              specifier.start,
              "Export '" + localName + "' is not defined in module"
            )
          }

          assignableBindings.add(localName)

          pairs.push([exportedName, localName])
        }

        hoistExports(this, node, pairs)
      } else {
        // Support re-exporting specifiers of an imported module:
        // export { name1, name2, ..., nameN } from "mod"
        const { importSpecifierMap } = this
        const request = source.value

        let map = importSpecifierMap.get(request)

        if (map === void 0) {
          map = createImportSpecifierMap()
          importSpecifierMap.set(request, map)
        }

        for (const specifier of specifiers) {
          const exportedName = specifier.exported.name
          const { reExports } = map

          let localNames = reExports.get(exportedName)

          if (localNames === void 0) {
            localNames = []
            reExports.set(exportedName, localNames)
          }

          const localName = specifier.type === "ExportNamespaceSpecifier"
            ? "*"
            : specifier.local.name

          localNames.push(localName)
        }

        hoistImports(this, node)
      }

      if (declaration !== null) {
        path.call(this, "visitWithoutReset", "declaration")
      }
    }

    visitMetaProperty(path) {
      const { meta } = path.getValue()

      if (meta.name === "import") {
        // Support import.meta.
        this.transforms |= TRANSFORMS_IMPORT_META

        overwrite(this, meta.start, meta.end, this.runtimeName + "._")
      }
    }
  }

  function createImportSpecifierMap() {
    return {
      imports: new Map,
      reExports: new Map,
      star: false
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
        declaration !== null &&
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
        (++i === lastIndex
          ? ""
          : ","
        )
    }

    code += "]);"

    return code
  }

  return new ImportExportVisitor
}

export default shared.inited
  ? shared.module.visitorImportExport
  : shared.module.visitorImportExport = init()
