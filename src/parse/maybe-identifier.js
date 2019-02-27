import isBindingIdentifier from "./is-binding-identifier.js"
import shared from "../shared.js"

function init() {
  function maybeIdentifier(path, callback) {
    const node = path.getValue()

    let parent = path.getParentNode()

    if (! isBindingIdentifier(node, parent)) {
      return
    }

    let nodeIndex = -2

    while (parent.type === "MemberExpression") {
      nodeIndex -= 2

      const grandParent = path.getNode(nodeIndex)

      if (grandParent === null) {
        break
      }

      parent = grandParent
    }

    callback(node, parent)
  }

  return maybeIdentifier
}

export default shared.inited
  ? shared.module.parseMaybeIdentifier
  : shared.module.parseMaybeIdentifier = init()
