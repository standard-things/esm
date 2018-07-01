import overwrite from "./overwrite.js"

function preserveChild(visitor, parent, childName) {
  const child = parent[childName]
  const childStart = child.start
  const parentStart = parent.start

  let indentation

  if (childStart > visitor.firstLineBreakPos) {
    const count = childStart - parentStart

    indentation = count === 7 ? "       " : " ".repeat(count)
  } else {
    indentation = ""
  }

  overwrite(visitor, parentStart, childStart, indentation)
}

export default preserveChild
