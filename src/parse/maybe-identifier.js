import isIdentifer from "./is-identifier.js"
import shared from "../shared.js"

function init() {
  function maybeIdentifier(path, callback) {
    const node = path.getValue()

    let parent = path.getParentNode()

    if (! isIdentifer(node, parent)) {
      return
    }

    let nodeIndex = -2
    let { type } = parent

    while (type === "MemberExpression") {
      nodeIndex -= 2

      const grandParent = path.getNode(nodeIndex)

      if (! grandParent) {
        break
      }

      parent = grandParent
      type = parent.type
    }

    callback(node, parent)
  }

  return maybeIdentifier
}

export default shared.inited
  ? shared.module.parseMaybeIdentifier
  : shared.module.parseMaybeIdentifier = init()
