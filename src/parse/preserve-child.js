import overwrite from "./overwrite.js"

function preserveChild(visitor, node, childName) {
  const child = node[childName]
  const childStart = child.start
  const nodeStart = node.start

  let padding

  if (childStart > visitor.firstLineBreakPos) {
    const count = childStart - nodeStart

    padding = count === 7 ? "       " : " ".repeat(count)
  } else {
    padding = ""
  }

  overwrite(visitor, nodeStart, childStart, padding)
}

export default preserveChild
