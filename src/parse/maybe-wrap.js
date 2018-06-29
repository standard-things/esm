import isIdentifer from "./is-identifier.js"
import shared from "../shared.js"

function init() {
  const checked = new Set

  function maybeWrap(visitor, path, callback) {
    let node = path.getValue()

    let parent = path.getParentNode()
    let { type } = parent

    if ((type === "AssignmentExpression" &&
        parent.left === node) ||
        ! isIdentifer(node, parent)) {
      return
    }

    let nodeIndex = -2

    while (type === "MemberExpression") {
      nodeIndex -= 2

      const grandParent = path.getNode(nodeIndex)

      if (! grandParent) {
        break
      }

      parent = grandParent
      type = parent.type
    }

    if (type === "Property") {
      if (parent.shorthand) {
        callback(node, parent)
        return
      }
    } else if (type !== "SwitchCase" &&
        type !== "TemplateLiteral" &&
        ! type.endsWith("Expression") &&
        ! type.endsWith("Statement")) {
      path.getParentNode((parent) => {
        const { type } = parent

        if (type === "AssignmentExpression" ||
            type === "ExpressionStatement") {
          node = parent
          return true
        }
      })
    }

    if (checked.has(node)) {
      return
    }

    checked.add(node)
    callback(node, parent)
  }

  return maybeWrap
}

export default shared.inited
  ? shared.module.parseMaybeWrap
  : shared.module.parseMaybeWrap = init()
