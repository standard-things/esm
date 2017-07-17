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
      names.push(pattern.name)
      break
    case "Property":
    case "ObjectProperty":
      queue.push(pattern.value)
      break
    case "AssignmentPattern":
      queue.push(pattern.left)
      break
    case "ObjectPattern":
      queue.push.apply(queue, pattern.properties)
      break
    case "ArrayPattern":
      queue.push.apply(queue, pattern.elements)
      break
    case "RestElement":
      queue.push(pattern.argument)
      break
    }
  }

  return names
}

export default getNamesFromPattern
