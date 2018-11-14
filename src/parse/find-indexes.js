import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    DOT
  } = CHAR_CODE

  function findIndexes(code, identifiers) {
    const indexes = []

    if (identifiers.length === 0) {
      return indexes
    }

    const pattern = new RegExp(
      "\\b(?:" + identifiers.join("|") + ")\\b",
      "g"
    )

    let match

    while ((match = pattern.exec(code))) {
      // Make sure the match isn't preceded by a `.` character, since that
      // probably means the identifier is a property access rather than a
      // variable reference.
      if (match.index === 0 ||
          code.charCodeAt(match.index - 1) !== DOT) {
        indexes.push(match.index)
      }
    }

    return indexes
  }

  return findIndexes
}

export default shared.inited
  ? shared.module.parseFindIndexes
  : shared.module.parseFindIndexes = init()
