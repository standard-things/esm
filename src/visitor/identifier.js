import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import raise from "../parse/raise.js"

const definedMap = new SafeWeakMap

class IdentifierVisitor extends Visitor {
  reset(rootPath, options) {
    this.magicString = options.magicString
  }

  visitIdentifier(path) {
    const node = path.getValue()

    if (node.name === "arguments") {
      const { operator, type } = path.getParentNode()

      if (! (type === "UnaryExpression" && operator === "typeof") &&
          ! isArgumentsDefined(path)) {
        const parser = {
          input: this.magicString.original,
          pos: node.start,
          start: node.start
        }

        raise(parser, parser.start, "arguments is not defined", ReferenceError)
      }
    }

    this.visitChildren(path)
  }
}

function isArgumentsDefined(path) {
  let defined = false

  path.getParentNode((parent) => {
    defined = definedMap.get(parent)

    if (defined !== void 0) {
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
