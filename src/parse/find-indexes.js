import CHAR_CODE from "../constant/char-code.js"

import escapeRegExp from "../util/escape-regexp.js"
import shared from "../shared.js"

function init() {
  const {
    DOT
  } = CHAR_CODE

  function findIndexes(code, identifiers) {
    const indexes = []
    const { length } = identifiers

    if (length === 0) {
      return indexes
    }

    const lastIndex = length - 1

    const pattern = new RegExp(
      "\\b(?:" +
      (() => {
        let i = -1
        let source = ""

        while (++i < length) {
          source +=
            escapeRegExp(identifiers[i]) +
            (i === lastIndex
              ? ""
              : "|"
            )
        }

        return source
      })() +
      ")\\b",
      "g"
    )

    let match

    while ((match = pattern.exec(code)) !== null) {
      const { index } = match

      // Make sure the match isn't preceded by a `.` character, since that
      // probably means the identifier is a property access rather than a
      // variable reference.
      if (index === 0 ||
          code.charCodeAt(index - 1) !== DOT) {
        indexes.push(index)
      }
    }

    return indexes
  }

  return findIndexes
}

export default shared.inited
  ? shared.module.parseFindIndexes
  : shared.module.parseFindIndexes = init()
