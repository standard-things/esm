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
    if (! node.body) {
      node.body = []
    }

    const { body } = node
    const exported = { __proto__: null }
    const identifiers = []
    const importedLocals = []

    const top = {
      hoistedExports: [],
      hoistedImportsString: "",
      hoistedPrefixString: "",
      identifiers,
      importedLocals,
      insertCharIndex: node.start,
      insertNodeIndex: 0,
      returnOutsideFunction: false
    }

    let inited = false

    while (this.type !== tt.eof) {
      if (this.type === tt._return) {
        top.returnOutsideFunction = true
      }

      const stmt = this.parseStatement(true, true, exported)
      let { expression, type } = stmt

      if (! inited) {
        // Avoid hoisting above string literal expression statements such as
        // "use strict", which may depend on occurring at the beginning of
        // their enclosing scopes.
        if (type === "ExpressionStatement" &&
            expression.type === "Literal" &&
            typeof expression.value === "string") {
          top.insertCharIndex = stmt.end
          top.insertNodeIndex = body.length + 1
          top.hoistedPrefixString = ";"
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
        for (const decl of object.declarations) {
          const names = getNamesFromPattern(decl.id)

          for (const name of names) {
            identifiers.push(name)
          }
        }
      } else if (type === "ClassDeclaration" ||
          type === "FunctionDeclaration") {
        identifiers.push(object.id.name)
      } else if (type === "ImportDeclaration") {
        for (const specifier of stmt.specifiers) {
          const { name } = specifier.local

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
