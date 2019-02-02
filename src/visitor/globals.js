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

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (! Reflect.has(this.globals, name)) {
        return
      }

      const parent = path.getParentNode()
      const { type } = parent

      if ((type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      this.changed = true

      let code = this.runtimeName + ".g."
      let pos = node.start

      if (type === "Property" &&
          parent.shorthand) {
        code = ":" + code + name
        pos = node.end
      }

      this.magicString.prependLeft(pos, code)
    }
  }

  return new GlobalsVisitor
}

export default shared.inited
  ? shared.module.visitorGlobals
  : shared.module.visitorGlobals = init()
