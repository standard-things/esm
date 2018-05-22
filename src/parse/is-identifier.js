function isIdentifier(node, parent) {
  if (node.type !== "Identifier") {
    return false
  }

  if (parent) {
    const { type } = parent

    if (type === "Property") {
      return parent.computed || parent.shorthand
    }

    if (type === "BreakStatement" ||
        type === "ContinueStatement" ||
        type === "LabeledStatement") {
      return false
    }
  }

  return true
}

export default isIdentifier
