import Visitor from "../visitor.js"

import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class RequireVisitor extends Visitor {
    reset(options) {
      this.found = false
      this.possibleIndexes = null

      if (options !== void 0) {
        this.possibleIndexes = options.possibleIndexes
      }
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (callee.name !== "require") {
        this.visitChildren(path)
        return
      }

      if (node.arguments.length === 0 ||
          isShadowed(path, "require", shadowedMap)) {
        return
      }

      this.found = true

      path.call(this, "visitWithoutReset", "arguments")
    }
  }

  return new RequireVisitor
}

export default shared.inited
  ? shared.module.visitorRequire
  : shared.module.visitorRequire = init()
