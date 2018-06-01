import overwrite from "./overwrite.js"

function preserveChild(visitor, node, childName) {
  const child = node[childName]
  const childStart = child.start
  const nodeStart = node.start

  let indentation

  if (childStart > visitor.firstLineBreakPos) {
    const count = childStart - nodeStart

    indentation = count === 7 ? "       " : " ".repeat(count)
  } else {
    indentation = ""
  }

  overwrite(visitor, nodeStart, childStart, indentation)
}

export default preserveChild
