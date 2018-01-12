import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import { getLineInfo } from "../vendor/acorn/src/locutil.js"

const definedMap = new SafeWeakMap

class IdentifierVisitor extends Visitor {
  reset(rootPath, options) {
    this.magicString = options.magicString
    this.warnedForArguments = false
    this.warnings = options.warnings
  }

  visitIdentifier(path) {
    if (this.warnedForArguments) {
      return
    }

    const node = path.getValue()

    if (node.name !== "arguments") {
      this.visitChildren(path)
      return
    }

    const { operator, type } = path.getParentNode()

    if ((type === "UnaryExpression" &&
         operator === "typeof") ||
        isArgumentsDefined(path)) {
      this.visitChildren(path)
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

export default new IdentifierVisitor
