import MagicString from "../magic-string.js"
import NullObject from "../null-object.js"
import Visitor from "../visitor.js"

import encodeId from "../util/encode-id.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import toStringLiteral from "../util/to-string-literal.js"

const codeOfCR = "\r".charCodeAt(0)

const { keys } = Object

class ImportExportVisitor extends Visitor {
  finalizeHoisting() {
    if (this.bodyInfo === null) {
      return
    }

    const codeToInsert =
      this.bodyInfo.hoistedPrefixString +
      toModuleExport(this, this.bodyInfo.hoistedExportsMap) +
      this.bodyInfo.hoistedExportsString +
      this.bodyInfo.hoistedImportsString

    this.magicString.prependRight(this.bodyInfo.insertCharIndex, codeToInsert)
  }

  reset(rootPath, code, options) {
    this.addedDynamicImport = false
    this.addedImportExport = false
    this.addedImportMeta = false
    this.assignableExports = new NullObject
    this.assignableImports = new NullObject
    this.bodyInfo = null
    this.changed = false
    this.code = code
    this.esm = options.esm,
    this.exportNames = []
    this.generateVarDeclarations = options.generateVarDeclarations
    this.madeChanges = false
    this.magicString = new MagicString(code)
    this.runtimeName = options.runtimeName
    this.specifiers = new NullObject
  }

  visitCallExpression(path) {
    const { callee } = path.getValue()

    if (callee.type === "Import") {
      this.changed =
      this.addedDynamicImport = true
      overwrite(this, callee.start, callee.end, this.runtimeName + ".i")
    }

    this.visitChildren(path)
  }

  visitImportDeclaration(path) {
    if (! this.esm) {
      return
    }

    this.changed =
    this.addedImportExport = true

    let i = -1
    const node = path.getValue()
    const { specifiers } = node
    const specifierMap = computeSpecifierMap(specifiers)
    const lastIndex = specifiers.length - 1

    let hoistedCode = specifiers.length
      ? (this.generateVarDeclarations ? "var " : "let ")
      : ""

    for (const specifier of specifiers) {
      hoistedCode +=
        specifier.local.name +
        (++i === lastIndex ? ";" : ",")
    }

    hoistedCode += toModuleImport(
      this,
      getSourceString(this, node),
      specifierMap
    )

    hoistImports(this, path, hoistedCode)
    addAssignableImports(this, specifierMap)
  }

  visitExportAllDeclaration(path) {
    if (! this.esm) {
      return
    }

    this.changed =
    this.addedImportExport = true

    const node = path.getValue()
    const specifierString = getSourceString(this, node)
    const specifierName = specifierString.slice(1, -1)

    this.specifiers[specifierName] = addNameToMap(new NullObject, "*")

    const { source } = node
    const hoistedCode = pad(
      this,
      this.runtimeName + ".w(" + specifierString,
      node.start,
      source.start
    ) + pad(
      this,
      ',[["*",' + this.runtimeName + ".n()]]);",
      source.end,
      node.end
    )

    hoistExports(this, path, hoistedCode)
  }

  visitExportDefaultDeclaration(path) {
    if (! this.esm) {
      return
    }

    this.changed =
    this.addedImportExport = true

    const node = path.getValue()
    const { declaration } = node
    const { id, type, functionParamsStart } = declaration

    if (type === "FunctionDeclaration" ||
        (id && type === "ClassDeclaration")) {
      const name = id ? id.name : encodeId("default")

      if (! id) {
        this.madeChanges = true
        this.magicString.prependRight(
          functionParamsStart,
          " " + name
        )
      }

      // If the exported default value is a function or class declaration,
      // it's important that the declaration be visible to the rest of the
      // code in the exporting module, so we must avoid compiling it to a
      // named function or class expression.
      hoistExports(this, path,
        addToSpecifierMap(new NullObject, "default", name),
        "declaration"
      )
    } else {
      // Otherwise, since the exported value is an expression, we use the
      // special `runtime.default(value)` form.
      path.call(this, "visitWithoutReset", "declaration")

      let prefix = this.runtimeName + ".d("
      let suffix = ");"

      if (type === "SequenceExpression") {
        // If the exported expression is a comma-separated sequence expression,
        // `this.code.slice(declaration.start, declaration.end)` may not include
        // the vital parentheses, so we should wrap the expression with parentheses
        // to make absolutely sure it is treated as a single argument to
        // `runtime.default()`, rather than as multiple arguments.
        prefix += "("
        suffix = ")" + suffix
      }

      overwrite(this, node.start, declaration.start, prefix)
      overwrite(this, declaration.end, node.end, suffix)
    }
  }

  visitExportNamedDeclaration(path) {
    if (! this.esm) {
      return
    }

    this.changed =
    this.addedImportExport = true

    const node = path.getValue()
    const { declaration } = node

    if (declaration) {
      const specifierMap = new NullObject
      const { id, type } = declaration

      if (id && (type === "ClassDeclaration" ||
                 type === "FunctionDeclaration")) {
        addNameToMap(specifierMap, id.name)
      } else if (type === "VariableDeclaration") {
        for (const varDecl of declaration.declarations) {
          const names = getNamesFromPattern(varDecl.id)

          for (const name of names) {
            addNameToMap(specifierMap, name)
          }
        }
      }

      hoistExports(this, path, specifierMap, "declaration")

      // Skip adding declared names to this.assignableExports if the
      // declaration is a const-kinded VariableDeclaration, because the
      // assignmentVisitor doesn't need to worry about changes to these
      // variables.
      if (canExportedValuesChange(node)) {
        addAssignableExports(this, specifierMap)
      }

      return
    }

    const { specifiers } = node

    if (! specifiers) {
      return
    }

    let specifierMap = computeSpecifierMap(specifiers)

    if (node.source == null) {
      hoistExports(this, path, specifierMap)
      addAssignableExports(this, specifierMap)
      return
    }

    const newMap = new NullObject
    const names = keys(specifierMap)

    for (const name of names) {
      const locals = keys(specifierMap[name])

      addToSpecifierMap(
        newMap,
        locals[0],
        this.runtimeName + ".entry._namespace." + name
      )
    }

    specifierMap = newMap

    // Even though the compiled code uses `runtime.watch()`, it should
    // still be hoisted as an export, i.e. before actual imports.
    hoistExports(this, path, toModuleImport(
      this,
      getSourceString(this, node),
      specifierMap
    ))
  }

  visitMetaProperty(path) {
    const { meta } = path.getValue()

    if (meta.name === "import") {
      this.changed =
      this.addedImportMeta = true
      overwrite(this, meta.start, meta.end, this.runtimeName + "._")
    }
  }
}

function addAssignableExports(visitor, specifierMap) {
  const { assignableExports } = visitor
  const names = keys(specifierMap)

  for (const name of names) {
    const locals = keys(specifierMap[name])

    // It's tempting to record the exported name as the value here,
    // instead of true, but there can be more than one exported name
    // per local variable, and we don't actually use the exported
    // name(s) in the assignmentVisitor, so it's not worth the added
    // complexity of tracking unused information.
    assignableExports[locals[0]] = true
  }
}

function addAssignableImports(visitor, specifierMap) {
  const { assignableImports } = visitor
  const names = keys(specifierMap)

  for (const name of names) {
    const locals = keys(specifierMap[name])

    for (const local of locals) {
      assignableImports[local] = true
    }
  }
}

function addNameToMap(map, name) {
  return addToSpecifierMap(map, name, name)
}

function addToSpecifierMap(map, __ported, local) {
  const locals = map[__ported] || (map[__ported] = new NullObject)
  locals[local] = true
  return map
}

// Returns a map from {im,ex}ported identifiers to lists of local variable
// names bound to those identifiers.
function computeSpecifierMap(specifiers) {
  const specifierMap = new NullObject

  for (const specifier of specifiers) {
    const local = specifier.local.name
    const { type } = specifier

    // The IMported or EXported name.
    let __ported = null

    if (type === "ImportSpecifier") {
      __ported = specifier.imported.name
    } else if (type === "ImportDefaultSpecifier") {
      __ported = "default"
    } else if (type === "ImportNamespaceSpecifier") {
      __ported = "*"
    } else if (type === "ExportSpecifier") {
      __ported = specifier.exported.name
    }

    if (typeof local === "string" &&
        typeof __ported === "string") {
      addToSpecifierMap(specifierMap, __ported, local)
    }
  }

  return specifierMap
}

function getBlockBodyInfo(visitor, path) {
  if (visitor.bodyInfo) {
    return visitor.bodyInfo
  }

  const { body, start } = path.getParentNode()

  let hoistedPrefixString = ""
  let insertCharIndex = start
  let insertNodeIndex = 0

  // Avoid hoisting above string literal expression statements such as
  // "use strict", which may depend on occurring at the beginning of
  // their enclosing scopes.
  let i = -1
  const stmtCount = body.length

  while (++i < stmtCount) {
    const stmt = body[i]

    if (stmt.type === "ExpressionStatement" &&
        stmt.expression.type === "Literal" &&
        typeof stmt.expression.value === "string") {
      insertCharIndex = stmt.end
      insertNodeIndex = i + 1
      hoistedPrefixString = ";"
    } else {
      break
    }
  }

  const bodyInfo = visitor.bodyInfo = new NullObject
  bodyInfo.insertCharIndex = insertCharIndex
  bodyInfo.insertNodeIndex = insertNodeIndex
  bodyInfo.hoistedExportsMap = new NullObject
  bodyInfo.hoistedExportsString = ""
  bodyInfo.hoistedImportsString = ""
  bodyInfo.hoistedPrefixString = hoistedPrefixString

  return bodyInfo
}

// Gets a string representation (including quotes) from an import or
// export declaration node.
function getSourceString(visitor, { source }) {
  return visitor.code.slice(source.start, source.end)
}

function hoistImports(visitor, importDeclPath, hoistedCode) {
  preserveLine(visitor, importDeclPath)
  const bodyInfo = getBlockBodyInfo(visitor, importDeclPath)
  bodyInfo.hoistedImportsString += hoistedCode
}

function hoistExports(visitor, exportDeclPath, mapOrString, childName) {
  if (childName) {
    preserveChild(visitor, exportDeclPath, childName)
  } else {
    preserveLine(visitor, exportDeclPath)
  }

  const bodyInfo = getBlockBodyInfo(visitor, exportDeclPath)

  if (typeof mapOrString === "string") {
    bodyInfo.hoistedExportsString += mapOrString
    return
  }

  const names = keys(mapOrString)

  for (const name of names) {
    const locals = keys(mapOrString[name])

    addToSpecifierMap(
      bodyInfo.hoistedExportsMap,
      name,
      locals[0]
    )
  }
}

function canExportedValuesChange({ declaration, type }) {
  if (type === "ExportDefaultDeclaration") {
    return declaration.type === "FunctionDeclaration" ||
           declaration.type === "ClassDeclaration"
  }

  if (type === "ExportNamedDeclaration" &&
      declaration &&
      declaration.type === "VariableDeclaration" &&
      declaration.kind === "const") {
    return false
  }

  return true
}

function overwrite(visitor, oldStart, oldEnd, newCode) {
  const padded = pad(visitor, newCode, oldStart, oldEnd)

  if (oldStart !== oldEnd) {
    visitor.madeChanges = true
    visitor.magicString.overwrite(oldStart, oldEnd, padded)
  } else if (padded !== "") {
    visitor.madeChanges = true
    visitor.magicString.prependRight(oldStart, padded)
  }
}

function pad(visitor, newCode, oldStart, oldEnd) {
  const oldLines = visitor.code.slice(oldStart, oldEnd).split("\n")
  const oldLineCount = oldLines.length
  const newLines = newCode.split("\n")
  const lastIndex = newLines.length - 1
  let i = lastIndex - 1

  while (++i < oldLineCount) {
    const oldLine = oldLines[i]
    const lastCharCode = oldLine.charCodeAt(oldLine.length - 1)

    if (i > lastIndex) {
      newLines[i] = ""
    }

    if (lastCharCode === codeOfCR) {
      newLines[i] += "\r"
    }
  }

  return newLines.join("\n")
}

function preserveChild(visitor, path, childName) {
  const node = path.getValue()
  const child = node[childName]

  overwrite(
    visitor,
    node.start,
    child.start,
    ""
  )
  overwrite(
    visitor,
    child.end,
    node.end,
    ""
  )

  path.call(visitor, "visitWithoutReset", childName)
}

function preserveLine(visitor, path) {
  const { end, start } = path.getValue()
  overwrite(visitor, start, end, "")
}

function safeParam(param, locals) {
  return locals.indexOf(param) === -1 ? param : safeParam("_" + param, locals)
}

function toModuleImport(visitor, specifierString, specifierMap) {
  const names = keys(specifierMap)
  const specifierName = specifierString.slice(1, -1)

  visitor.specifiers[specifierName] = specifierMap

  let code = visitor.runtimeName + ".w(" + specifierString

  if (! names.length) {
    return code + ");"
  }

  let i = -1
  const lastIndex = names.length - 1

  code += ",["

  for (const name of names) {
    const locals = keys(specifierMap[name])
    const valueParam = safeParam("v", locals)

    code +=
      // Generate plain functions, instead of arrow functions,
      // to avoid a perf hit in Node 4.
      "[" + toStringLiteral(name) + ",function(" + valueParam + "){" +
      // Multiple local variables become a compound assignment.
      locals.join("=") + "=" + valueParam +
      "}]"

    if (++i !== lastIndex) {
      code += ","
    }
  }

  code += "]);"

  return code
}

function toModuleExport(visitor, specifierMap) {
  const names = keys(specifierMap)

  let code = ""

  if (! names.length) {
    return code
  }

  let i = -1
  const { exportNames } = visitor
  const lastIndex = names.length - 1

  code += visitor.runtimeName + ".e(["

  for (const name of names) {
    const locals = keys(specifierMap[name])

    exportNames.push(name)

    code +=
      "[" + toStringLiteral(name) + ",()=>" +
      locals[0] +
      "]"

    if (++i !== lastIndex) {
      code += ","
    }
  }

  code += "]);"

  return code
}

export default new ImportExportVisitor
