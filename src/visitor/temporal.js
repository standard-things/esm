import Visitor from "../visitor.js"

import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const checkedMap = new Map
  const shadowedMap = new Map

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

      if (this.importLocals[name] === true &&
          ! isShadowed(path, name, shadowedMap)) {
        wrapInCheck(this, path)
      }

      this.visitChildren(path)
    }
  }

  function wrapInCheck(visitor, path) {
    let node = path.getValue()

    const { name } = node

    const parent = path.getParentNode(({ type }) => {
      return type === "AssignmentExpression" ||
        type === "CallExpression" ||
        type === "ExpressionStatement" ||
        type === "ReturnStatement"
    })

    if (parent) {
      node = parent
    }

    if (node.type === "ReturnStatement") {
      node = node.argument
    }

    if (checkedMap.has(node)) {
      return
    }

    const { end, start } = node

    checkedMap.set(node, true)

    visitor.magicString
      .prependRight(start, visitor.runtimeName + '.t("' + name + '",')
      .prependRight(end, ")")
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
