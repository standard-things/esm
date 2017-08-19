import Visitor from "./visitor.js"

import raise from "./parse/raise.js"

class IdentifierVisitor extends Visitor {
  visitIdentifier(path) {
    const node = path.getValue()

    if (node.name === "arguments") {
      const parentNode = path.getParentNode()

      if (parentNode.type !== "UnaryExpression" ||
          parentNode.operator !== "typeof") {
        const parser = {
          pos: node.start,
          start: node.start
        }

        raise(parser, parser.start, "arguments is not defined", ReferenceError)
      }
    }

    this.visitChildren(path)
  }
}

export default IdentifierVisitor
