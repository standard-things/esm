"use strict"

const assert = require("assert")
const getOption = require("./options.js").get
const MagicString = require("./magic-string.js")
const OrderedMap = require("./ordered-map.js")
const utils = require("./utils.js")
const Visitor = require("./visitor.js")

const codeOfCR = "\r".charCodeAt(0)

class ImportExportVisitor extends Visitor {
  finalizeHoisting() {
    if (this.bodyInfo === null) {
      return
    }

    const codeToInsert =
      this.bodyInfo.hoistedPrefixString +
      toModuleExport(this, this.bodyInfo.hoistedExportsMap, false) +
      toModuleExport(this, this.bodyInfo.hoistedConstExportsMap, true) +
      this.bodyInfo.hoistedExportsString +
      this.bodyInfo.hoistedImportsString

    if (codeToInsert) {
      this.magicString.prependRight(this.bodyInfo.insertCharIndex, codeToInsert)
    }

    // Just in case we call finalizeHoisting again, don't hoist anything.
    this.bodyInfo = null
  }

  reset(rootPath, code, options) {
    this.bodyInfo = null
    this.code = code
    this.exportedLocalNames = Object.create(null)
    this.generateLetDeclarations = !! getOption(options, "generateLetDeclarations")
    this.madeChanges = false
    this.magicString = new MagicString(code)
    this.moduleAlias = getOption(options, "moduleAlias")
    this.sourceType = getOption(options, "sourceType")
  }

  visitCallExpression(path) {
    const node = path.getNode()
    const callee = node.callee

    if (callee.type === "Import") {
      overwrite(this, callee.start, callee.end, this.moduleAlias + ".import")
    }

    this.visitChildren(path)
  }

  visitImportDeclaration(path) {
    let i = -1
    const decl = path.getValue()
    const specifierCount = decl.specifiers.length
    const lastIndex = specifierCount - 1

    let hoistedCode = specifierCount
      ? (this.generateLetDeclarations ? "let " : "var ")
      : ""

    while (++i < specifierCount) {
      const identifier = decl.specifiers[i].local.name
      const isLast = i === lastIndex
      hoistedCode +=
        identifier +
        (isLast ? ";" : ",")
    }

    hoistedCode += toModuleImport(
      this,
      getSourceString(this, decl),
      computeSpecifierMap(decl.specifiers)
    )

    hoistImports(this, path, hoistedCode)
  }

  visitExportAllDeclaration(path) {
    const decl = path.getValue()
    const hoistedCode = pad(
      this,
      this.moduleAlias + ".watch(" + getSourceString(this, decl),
      decl.start,
      decl.source.start
    ) + pad(
      this,
      ',[["*",' + this.moduleAlias + ".makeNsSetter()]]);",
      decl.source.end,
      decl.end
    )

    hoistExports(this, path, hoistedCode)
  }

  visitExportDefaultDeclaration(path) {
    const decl = path.getValue()
    const dd = decl.declaration

    if (dd.id && (dd.type === "FunctionDeclaration" ||
                  dd.type === "ClassDeclaration")) {
      // If the exported default value is a function or class declaration,
      // it's important that the declaration be visible to the rest of the
      // code in the exporting module, so we must avoid compiling it to a
      // named function or class expression.
      hoistExports(this, path,
        addToSpecifierMap(new OrderedMap, "default", dd.id.name),
        "declaration"
      )

    } else {
      // Otherwise, since the exported value is an expression, we use the
      // special module.exportDefault(value) form.
      path.call(this, "visitWithoutReset", "declaration")
      assert.strictEqual(decl.declaration, dd)

      let prefix = this.moduleAlias + ".exportDefault("
      let suffix = ");"

      if (dd.type === "SequenceExpression") {
        // If the exported expression is a comma-separated sequence
        // expression, this.code.slice(dd.start, dd.end) may not include
        // the vital parentheses, so we should wrap the expression with
        // parentheses to make absolutely sure it is treated as a single
        // argument to the module.exportDefault method, rather than as
        // multiple arguments.
        prefix += "("
        suffix = ")" + suffix
      }

      overwrite(this, decl.start, dd.start, prefix)
      overwrite(this, dd.end, decl.end, suffix, true)
    }
  }

  visitExportNamedDeclaration(path) {
    const decl = path.getValue()
    const dd = decl.declaration

    if (dd) {
      const specifierMap = new OrderedMap
      const type = dd.type

      if (dd.id && (type === "ClassDeclaration" ||
                    type === "FunctionDeclaration")) {
        addNameToMap(specifierMap, dd.id.name)
      } else if (type === "VariableDeclaration") {
        let i = -1
        const ddCount = dd.declarations.length

        while (++i < ddCount) {
          let j = -1
          const names = utils.getNamesFromPattern(dd.declarations[i].id)
          const nameCount = names.length

          while (++j < nameCount) {
            addNameToMap(specifierMap, names[j])
          }
        }
      }

      hoistExports(this, path, specifierMap, "declaration")

      if (canExportedValuesChange(decl)) {
        // We can skip adding declared names to this.exportedLocalNames if
        // the declaration was a const-kinded VariableDeclaration, because
        // the assignmentVisitor will not need to worry about changes to
        // these variables.
        addExportedLocalNames(this, specifierMap)
      }

      return
    }

    if (decl.specifiers) {
      let specifierMap = computeSpecifierMap(decl.specifiers)

      if (decl.source) {
        if (specifierMap) {
          let i = -1
          const newMap = new OrderedMap
          const exportedNames = specifierMap.keys()
          const nameCount = exportedNames.length

          while (++i < nameCount) {
            let j = -1
            const exported = exportedNames[i]
            const locals = specifierMap.get(exported).keys()
            const localCount = locals.length

            while (++j < localCount) {
              addToSpecifierMap(newMap, locals[j], this.moduleAlias + ".exports." + exported)
            }
          }

          specifierMap = newMap
        }

        // Even though the compiled code uses module.watch, it should
        // still be hoisted as an export, i.e. before actual imports.
        hoistExports(this, path, toModuleImport(
          this,
          getSourceString(this, decl),
          specifierMap
        ))

      } else {
        hoistExports(this, path, specifierMap)
        addExportedLocalNames(this, specifierMap)
      }
    }
  }
}

function addExportedLocalNames(visitor, specifierMap) {
  const exportedNames = specifierMap.keys()
  let nameCount = exportedNames.length

  while (nameCount--) {
    const exported = exportedNames[nameCount]
    const locals = specifierMap.get(exported).keys()
    let localCount = locals.length

    while (localCount--) {
      // It's tempting to record the exported name as the value here,
      // instead of true, but there can be more than one exported name
      // per local variable, and we don't actually use the exported
      // name(s) in the assignmentVisitor, so it's not worth the added
      // complexity of tracking unused information.
      visitor.exportedLocalNames[locals[localCount]] = true
    }
  }
}

function addNameToMap(map, name) {
  addToSpecifierMap(map, name, name)
}

function addToSpecifierMap(map, __ported, local) {
  const locals = map.get(__ported) || new OrderedMap
  locals.set(local, true)
  return map.set(__ported, locals)
}

// Returns a map from {im,ex}ported identifiers to lists of local variable
// names bound to those identifiers.
function computeSpecifierMap(specifiers) {
  let i = -1
  const specifierCount = specifiers.length
  const specifierMap = new OrderedMap

  while (++i < specifierCount) {
    const s = specifiers[i]

    const local =
      s.type === "ExportDefaultSpecifier" ? "default" :
      s.type === "ExportNamespaceSpecifier" ? "*" :
      s.local.name

    const __ported = // The IMported or EXported name.
      s.type === "ImportSpecifier" ? s.imported.name :
      s.type === "ImportDefaultSpecifier" ? "default" :
      s.type === "ImportNamespaceSpecifier" ? "*" :
      (s.type === "ExportSpecifier" ||
       s.type === "ExportDefaultSpecifier" ||
       s.type === "ExportNamespaceSpecifier") ? s.exported.name :
      null

    if (typeof local === "string" && typeof __ported === "string") {
      addToSpecifierMap(specifierMap, __ported, local)
    }
  }

  return specifierMap
}

function getBlockBodyInfo(visitor, path) {
  if (visitor.bodyInfo !== null) {
    return visitor.bodyInfo
  }

  const parent = path.getParentNode()
  const body = parent.body

  let hoistedPrefixString = ""
  let insertCharIndex = parent.start
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

  const bodyInfo = visitor.bodyInfo = Object.create(null)
  bodyInfo.insertCharIndex = insertCharIndex
  bodyInfo.insertNodeIndex = insertNodeIndex
  bodyInfo.hoistedConstExportsMap = new OrderedMap
  bodyInfo.hoistedExportsMap = new OrderedMap
  bodyInfo.hoistedExportsString = ""
  bodyInfo.hoistedImportsString = ""
  bodyInfo.hoistedPrefixString = hoistedPrefixString

  return bodyInfo
}

// Gets a string representation (including quotes) from an import or
// export declaration node.
function getSourceString(visitor, decl) {
  if (visitor.code) {
    return visitor.code.slice(decl.source.start, decl.source.end)
  }
  return JSON.stringify(decl.source.value)
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

  const constant = ! canExportedValuesChange(exportDeclPath.getValue())
  const exportedNames = mapOrString.keys()
  let nameCount = exportedNames.length

  while (nameCount--) {
    const exported = exportedNames[nameCount]
    const locals = mapOrString.get(exported).keys()

    let i = -1
    let localCount = locals.length

    while (++i < localCount) {
      addToSpecifierMap(
        constant
          ? bodyInfo.hoistedConstExportsMap
          : bodyInfo.hoistedExportsMap,
        exported,
        locals[i]
      )
    }
  }
}

function canExportedValuesChange(exportDecl) {
  if (exportDecl) {
    if (exportDecl.type === "ExportDefaultDeclaration") {
      const dd = exportDecl.declaration
      return (dd.type === "FunctionDeclaration" ||
              dd.type === "ClassDeclaration")
    }

    if (exportDecl.type === "ExportNamedDeclaration") {
      const dd = exportDecl.declaration
      if (dd &&
          dd.type === "VariableDeclaration" &&
          dd.kind === "const") {
        return false
      }
    }
  }

  return true
}

function overwrite(visitor, oldStart, oldEnd, newCode, trailing) {
  if (! visitor.code) {
    return
  }

  const padded = pad(visitor, newCode, oldStart, oldEnd)

  if (oldStart !== oldEnd) {
    visitor.madeChanges = true
    visitor.magicString.overwrite(oldStart, oldEnd, padded)
    return
  }

  if (padded === "") {
    return
  }

  visitor.madeChanges = true
  if (trailing) {
    visitor.magicString.appendLeft(oldStart, padded)
  } else {
    visitor.magicString.prependRight(oldStart, padded)
  }
}

function pad(visitor, newCode, oldStart, oldEnd) {
  if (! visitor.code) {
    return newCode
  }

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
  const value = path.getValue()
  const child = value ? value[childName] : null

  if (child && visitor.code) {
    overwrite(
      visitor,
      value.start,
      child.start,
      ""
    )
    overwrite(
      visitor,
      child.end,
      value.end,
      ""
    )
  }

  path.call(visitor, "visitWithoutReset", childName)
}

function preserveLine(visitor, path) {
  if (visitor.code) {
    const value = path.getValue()
    overwrite(visitor, value.start, value.end, "")
  }
}

function safeParam(param, locals) {
  if (locals.indexOf(param) < 0) {
    return param
  }
  return safeParam("_" + param, locals)
}

function toModuleImport(visitor, code, specifierMap) {
  const importedNames = specifierMap.keys()
  const nameCount = importedNames.length

  code = visitor.moduleAlias + ".watch(" + code

  if (! nameCount) {
    code += ");"
    return code
  }

  let i = -1
  const lastIndex = nameCount - 1

  code += ",["

  while (++i < nameCount) {
    const imported = importedNames[i]
    const isLast = i === lastIndex
    const locals = specifierMap.get(imported).keys()
    const valueParam = safeParam("v", locals)

    code +=
      // Generate plain functions, instead of arrow functions,
      // to avoid a perf hit in Node 4.
      "[" + JSON.stringify(imported) + ",function(" + valueParam + "){" +
      // Multiple local variables become a compound assignment.
      locals.join("=") + "=" + valueParam +
      "}]"

    if (! isLast) {
      code += ","
    }
  }

  code += "]);"

  return code
}

function toModuleExport(visitor, specifierMap, constant) {
  const exportedNames = specifierMap.keys()
  const nameCount = exportedNames.length

  let code = ""

  if (! nameCount) {
    return code
  }

  let i = -1
  const lastIndex = nameCount - 1
  code += visitor.moduleAlias + ".export(["

  while (++i < nameCount) {
    const exported = exportedNames[i]
    const isLast = i === lastIndex
    const locals = specifierMap.get(exported).keys()

    assert.strictEqual(locals.length, 1)

    code +=
      "[" + JSON.stringify(exported) + ",()=>" +
      locals[0] +
      "]"

    if (! isLast) {
      code += ","
    }
  }

  // The second argument to module.export indicates whether the getter
  // functions provided in the first argument are constant or not.
  code += constant ? "],1);" : "]);"

  return code
}

module.exports = ImportExportVisitor
