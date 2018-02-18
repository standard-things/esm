import ASCII from "../ascii.js"

const {
  PERIOD
} = ASCII

function findIndexes(code, identifiers) {
  const indexes = []

  if (! identifiers.length) {
    return indexes
  }

  const pattern = new RegExp(
    "\\b(?:" + identifiers.join("|") + ")\\b",
    "g"
  )

  let match

  while ((match = pattern.exec(code))) {
    // Make sure the match is not preceded by a `.` character, since that
    // probably means the identifier is a property access rather than a
    // variable reference.
    if (! match.index ||
        code.charCodeAt(match.index - 1) !== PERIOD) {
      indexes.push(match.index)
    }
  }

  return indexes
}

export default findIndexes
