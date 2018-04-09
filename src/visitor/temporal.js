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
    let key
    let node = path.getValue()
    let useParent = false

    const { name } = node

    const parent = path.getParentNode(({ type }) => {
      if (type === "ForStatement") {
        return true
      }

      if (type === "ReturnStatement") {
        useParent = true
        key = "argument"
        return true
      }

      if (type === "SwitchStatement") {
        useParent = true
        key = "discriminant"
        return true
      }

      if (type === "DoWhileStatement" ||
          type === "IfStatement" ||
          type === "WhileStatement") {
        useParent = true
        key = "test"
        return true
      }

      if (type === "AssignmentExpression" ||
          type === "CallExpression" ||
          type === "ExpressionStatement") {
        useParent = true
        return true
      }
    })

    if (useParent) {
      node = parent

      if (key) {
        node = node[key]
      }
    }

    if (checkedMap.has(node)) {
      return
    }

    checkedMap.set(node, true)

    visitor.magicString
      .prependRight(node.start, visitor.runtimeName + '.t("' + name + '",')
      .prependRight(node.end, ")")
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
