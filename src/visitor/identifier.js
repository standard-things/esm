import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import raise from "../parse/raise.js"

const definedMap = new SafeWeakMap

class IdentifierVisitor extends Visitor {
  reset(rootPath, options) {
    this.magicString = options.magicString
    this.warnedForArguments = false
    this.warnings = options.warnings
  }

  visitIdentifier(path) {
    if (this.warnedForArguments) {
      this.visitChildren(path)
      return
    }

    const node = path.getValue()

    if (node.name !== "arguments") {
      this.visitChildren(path)
      return
    }

    const { start } = node
    const { operator, type } = path.getParentNode()

    if ((type === "UnaryExpression" &&
         operator === "typeof") ||
        isArgumentsDefined(path)) {
      this.visitChildren(path)
      return
    }

    const parser = {
      input: this.magicString.original,
      pos: start,
      start
    }

    try {
      raise(parser, start, "@std/esm detected undefined arguments access", Error)
    } catch (e) {
      e.name = "Warning"
      this.warnedForArguments = true
      this.warnings.push(e)
    }

    this.visitChildren(path)
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
