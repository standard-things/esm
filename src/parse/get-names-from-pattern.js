import GenericArray from "../generic/array.js"

function getNamesFromPattern(pattern) {
  let i = -1
  const names = []
  const queue = [pattern]

  while (++i < queue.length) {
    const pattern = queue[i]

    if (pattern === null) {
      // The ArrayPattern .elements array can contain null to indicate that
      // the position is a hole.
      continue
    }

    // Cases are ordered from most to least likely to encounter.
    switch (pattern.type) {
      case "Identifier":
        GenericArray.push(names, pattern.name)
        break

      case "Property":
      case "ObjectProperty":
        GenericArray.push(queue, pattern.value)
        break

      case "AssignmentPattern":
        GenericArray.push(queue, pattern.left)
        break

      case "ObjectPattern":
        GenericArray.push(queue, ...pattern.properties)
        break

      case "ArrayPattern":
        GenericArray.push(queue, ...pattern.elements)
        break

      case "RestElement":
        GenericArray.push(queue, pattern.argument)
        break
    }
  }

  return names
}

export default getNamesFromPattern
