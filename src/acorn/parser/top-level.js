import errors from "../../parse/errors.js"
import getIdentifiersFromPattern from "../../parse/get-identifiers-from-pattern.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.parseTopLevel = parseTopLevel
      return parser
    }
  }

  function parseTopLevel(node) {
    const body = node.body || (node.body = [])
    const exported = { __proto__: null }
    const funcs = { __proto__: null }
    const identifiers = { __proto__: null }
    const importedLocals = { __proto__: null }
    const { inModule } = this

    const top = {
      identifiers,
      importedLocals,
      insertIndex: node.start,
      insertPrefix: ""
    }

    let inited = false

    while (this.type !== tt.eof) {
      const stmt = this.parseStatement(null, true, exported)

      let { expression, type } = stmt

      if (! inited) {
        // Avoid hoisting above string literal expression statements such as
        // "use strict", which may depend on occurring at the beginning of
        // their enclosing scopes.
        if (type === "ExpressionStatement" &&
            expression.type === "Literal" &&
            typeof expression.value === "string") {
          top.insertIndex = stmt.end
          top.insertPrefix = ";"
        } else {
          inited = true
        }
      }

      let object = stmt

      if (type === "ExportDefaultDeclaration" ||
          type === "ExportNamedDeclaration") {
        object = stmt.declaration
        type = object ? object.type : ""
      }

      if (type === "VariableDeclaration") {
        for (const declaration of object.declarations) {
          const ids = getIdentifiersFromPattern(declaration.id)

          for (const id of ids) {
            const { name } = id

            if (inModule &&
                Reflect.has(funcs, name)) {
              raiseRedeclaration(this, id.start, name)
            }

            identifiers[name] = true
          }
        }
      } else if (type === "ClassDeclaration") {
        const { id } = object

        if (id) {
          identifiers[id.name] = true
        }
      } else if (type === "FunctionDeclaration") {
        const { id } = object

        if (id) {
          const { name } = id

          if (inModule &&
              Reflect.has(identifiers, name)) {
            raiseRedeclaration(this, id.start, name)
          }

          funcs[name] =
          identifiers[name] = true
        }
      } else if (type === "ImportDeclaration") {
        for (const { local } of object.specifiers) {
          const { name } = local

          if (Reflect.has(importedLocals, name)) {
            raiseRedeclaration(this, local.start, name)
          }

          identifiers[name] =
          importedLocals[name] = true
        }
      }

      body.push(stmt)
    }

    this.next()

    node.sourceType = this.options.sourceType
    node.top = top
    return this.finishNode(node, "Program")
  }

  function raiseRedeclaration(parser, pos, name) {
    throw new errors.SyntaxError(
      parser.input,
      pos,
      "Identifier '" + name + "' has already been declared"
    )
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTopLevel
  : shared.module.acornParserTopLevel = init()
