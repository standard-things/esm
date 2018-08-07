import getNamesFromPattern from "../../parse/get-names-from-pattern.js"
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
    node.body || (node.body = [])

    const { body } = node
    const exported = { __proto__: null }
    const identifiers = []
    const importedLocals = []

    const top = {
      identifiers,
      importedLocals,
      insertIndex: node.start,
      insertPrefix: ""
    }

    let inited = false

    while (this.type !== tt.eof) {
      const stmt = this.parseStatement(true, true, exported)
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

      if (type === "ExportNamedDeclaration") {
        object = stmt.declaration
        type = object ? object.type : ""
      }

      if (type === "VariableDeclaration") {
        for (const { id } of object.declarations) {
          const names = getNamesFromPattern(id)

          for (const name of names) {
            identifiers.push(name)
          }
        }
      } else if (type === "ClassDeclaration" ||
          type === "FunctionDeclaration") {
        identifiers.push(object.id.name)
      } else if (type === "ImportDeclaration") {
        for (const { local } of stmt.specifiers) {
          const { name } = local

          identifiers.push(name)
          importedLocals.push(name)
        }
      }

      body.push(stmt)
    }

    this.next()

    node.sourceType = this.options.sourceType
    node.top = top
    return this.finishNode(node, "Program")
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTopLevel
  : shared.module.acornParserTopLevel = init()
