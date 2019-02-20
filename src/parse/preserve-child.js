import overwrite from "./overwrite.js"
import shared from "../shared.js"

function init() {
  function preserveChild(visitor, parent, childName) {
    const child = parent[childName]
    const childStart = child.start
    const parentStart = parent.start

    let indentation = ""

    if (childStart > visitor.firstLineBreakPos) {
      const count = childStart - parentStart

      indentation = count === 7
        ? "       "
        : " ".repeat(count)
    }

    return overwrite(visitor, parentStart, childStart, indentation)
  }

  return preserveChild
}

export default shared.inited
  ? shared.module.parsePreserveChild
  : shared.module.parsePreserveChild = init()
