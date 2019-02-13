import Visitor from "../visitor.js"

import assign from "../util/assign.js"
import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const defaultGlobals = {
    Reflect: true,
    console: true
  }

  const shadowedMap = new Map

  class GlobalsVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.globals = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options !== void 0) {
        this.globals = options.globals
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
      }

      if (this.globals === null) {
        this.globals = assign({ __proto__: null }, defaultGlobals)
      }
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (callee.type !== "MemberExpression") {
        this.visitChildren(path)
        return
      }

      const { object } = callee
      const { name } = object

      if (! Reflect.has(this.globals, name)) {
        this.visitChildren(path)
        return
      }

      const args = node.arguments

      if (args.length === 0) {
        return
      }

      const parent = path.getParentNode()

      if (! isIdentifer(object, parent) ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      if (name === "console") {
        let skip = true

        for (const { type } of args) {
          if (type !== "Literal" &&
              type !== "TemplateLiteral") {
            skip = false
            break
          }
        }

        if (skip) {
          return
        }
      }

      this.changed = true

      this.magicString.prependLeft(object.start, this.runtimeName + ".g.")

      path.call(this, "visitWithoutReset", "arguments")
    }
  }

  return new GlobalsVisitor
}

export default shared.inited
  ? shared.module.visitorGlobals
  : shared.module.visitorGlobals = init()
