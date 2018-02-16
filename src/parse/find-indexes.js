import GenericArray from "../generic/array.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"
import SafeRegExp from "../builtin/regexp.js"

function findIndexes(code, identifiers) {
  const indexes = []

  if (! identifiers.length) {
    return indexes
  }

  const pattern = new SafeRegExp(
    "\\b(?:" + GenericArray.join(identifiers, "|") + ")\\b",
    "g"
  )

  let match

  while ((match = GenericRegExp.exec(pattern, code))) {
    // Make sure the match is not preceded by a `.` character, since that
    // probably means the identifier is a property access rather than a
    // variable reference.
    if (! match.index ||
        GenericString.charCodeAt(code, match.index - 1) !== 46 /* . */) {
      GenericArray.push(indexes, match.index)
    }
  }

  return indexes
}

export default findIndexes
