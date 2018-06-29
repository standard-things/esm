import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class ConsoleVisitor extends Visitor {
    reset(rootPath, options) {
      this.changed = false
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
    }

    visitIdentifier(path) {
      const node = path.getValue()

      if (node.name !== "console") {
        return
      }

      const parent = path.getParentNode()
      const { type } = parent

      if ((type === "AssignmentExpression" &&
           parent.left === node) ||
          (type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, "console", shadowedMap)) {
        return
      }

      this.changed = true
      this.magicString.prependLeft(node.start, "global.")
    }
  }

  return new ConsoleVisitor
}

export default shared.inited
  ? shared.module.visitorConsole
  : shared.module.visitorConsole = init()
