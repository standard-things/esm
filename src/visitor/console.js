import Visitor from "../visitor.js"

import getShadowed from "../parse/get-shadowed.js"
import isIdentifer from "../parse/is-identifier.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class ConsoleVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options) {
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()

      if (node.name !== "console") {
        return
      }

      const parent = path.getParentNode()
      const { type } = parent

      if ((type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          getShadowed(path, "console", shadowedMap)) {
        return
      }

      this.changed = true

      let code = this.runtimeName + ".g."
      let pos = node.start

      if (type === "Property" &&
          parent.shorthand) {
        code = ":" + code + "console"
        pos = node.end
      }

      this.magicString.prependLeft(pos, code)
    }
  }

  return new ConsoleVisitor
}

export default shared.inited
  ? shared.module.visitorConsole
  : shared.module.visitorConsole = init()
