import Visitor from "../visitor.js"

import raise from "../parse/raise.js"

class IdentifierVisitor extends Visitor {
  reset(rootPath, options) {
    this.magicString = options.magicString
  }

  visitIdentifier(path) {
    const node = path.getValue()

    if (node.name === "arguments") {
      const { operator, type } = path.getParentNode()

      if ((type !== "UnaryExpression" || operator !== "typeof") &&
          ! isArgumentsDefined(path, node.name)) {
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

function isArgumentsDefined(path, name) {
  let defined = false

  path.getParentNode((parent) => {
    const type = parent.type

    if (type === "FunctionDeclaration" ||
        type === "FunctionExpression") {
      return defined = true
    }

    return false
  })

  return defined
}

export default new IdentifierVisitor
