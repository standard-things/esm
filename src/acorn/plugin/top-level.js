import getNamesFromPattern from "../../parse/get-names-from-pattern.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"

function init() {
  const Plugin = {
    __proto__: null,
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
    const idents = []
    const temporals = []

    const top = {
      __proto__: null,
      hoistedExports: [],
      hoistedExportsString: "",
      hoistedImportsString: "",
      hoistedPrefixString: "",
      idents,
      insertCharIndex: node.start,
      insertNodeIndex: 0,
      returnOutsideFunction: false,
      temporals
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
        const { kind } = object
        const isTemporal = kind !== "var"

        for (const decl of object.declarations) {
          const names = getNamesFromPattern(decl.id)

          for (const name of names) {
            idents.push(name)

            if (isTemporal) {
              temporals.push(name)
            }
          }
        }
      } else if (type === "ClassDeclaration" ||
          type === "FunctionDeclaration") {
        idents.push(object.id.name)
      } else if (type === "ImportDeclaration") {
        for (const specifier of stmt.specifiers) {
          idents.push(specifier.local.name)
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
  ? shared.module.acornPluginTopLevel
  : shared.module.acornPluginTopLevel = init()
