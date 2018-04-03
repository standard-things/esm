import Visitor from "../visitor.js"

import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new WeakMap

  class TemporalVisitor extends Visitor {
    reset(rootPath, options) {
      this.assignableExports = options.assignableExports
      this.importLocals = options.importLocals
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.runtimeName = options.runtimeName
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      const parent = path.getParentNode()

      if (parent.type === "AssignmentExpression" &&
          parent.left === node) {
        this.visitChildren(path)
        return
      }

      if (this.importLocals[name] === true &&
          ! isShadowed(path, name, shadowedMap)) {
        wrapInCheck(this, path)
      }

      this.visitChildren(path)
    }
  }

  function wrapInCheck(visitor, path) {
    const { end, start } = path.getValue()

    visitor.magicString
      .prependRight(start, visitor.runtimeName + ".t(")
      .prependRight(end, ")")
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
