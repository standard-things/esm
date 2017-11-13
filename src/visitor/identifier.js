import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import raise from "../parse/raise.js"

const definedMap = new SafeWeakMap

class IdentifierVisitor extends Visitor {
  reset(rootPath, options) {
    this.magicString = options.magicString
    this.warnings = options.warnings
  }

  visitIdentifier(path) {
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

    const parser = {
      input: this.magicString.original,
      pos: node.start,
      start: node.start
    }

    try {
      raise(parser, parser.start, "@std/esm detected undefined arguments access", Error)
    } catch (e) {
      e.name = "Warning"
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
