import Visitor from "../visitor.js"

import { getLineInfo } from "../acorn.js"
import shared from "../shared.js"

function init() {
  const definedMap = new WeakMap

  class IdentifierVisitor extends Visitor {
    reset(rootPath, options) {
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.warnedForArguments = false
      this.warnings = options.warnings
    }

    visitIdentifier(path) {
      if (this.warnedForArguments) {
        return
      }

      const node = path.getValue()

      if (node.name !== "arguments") {
        return
      }

      const { operator, type } = path.getParentNode()

      if ((type === "UnaryExpression" &&
          operator === "typeof") ||
          isArgumentsDefined(path)) {
        return
      }

      const { column, line } = getLineInfo(this.magicString.original, node.start)

      this.warnedForArguments = true
      this.warnings.push({ args: [line, column], code: "WRN_ARGUMENTS_ACCESS" })
    }

    visitWithoutReset(path) {
      if (! this.warnedForArguments) {
        super.visitWithoutReset(path)
      }
    }
  }

  function isArgumentsDefined(path) {
    let defined = false

    path.getParentNode((parent) => {
      defined = definedMap.get(parent)

      if (defined) {
        return defined
      }

      const { type } = parent

      defined =
        type === "FunctionDeclaration" ||
        type === "FunctionExpression"

      definedMap.set(parent, defined)
      return defined
    })

    return defined
  }

  return new IdentifierVisitor
}

export default shared.inited
  ? shared.module.visitorIdentifier
  : shared.module.visitorIdentifier = init()
