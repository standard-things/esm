import { isIdentifierChar, isIdentifierStart } from "../acorn.js"

import shared from "../shared.js"

function init() {
  function isIdentifierName(name) {
    if (typeof name !== "string" ||
        name.length === 0) {
      return false
    }

    let i = 0
    let point = name.codePointAt(i)

    if (! isIdentifierStart(point, true)) {
      return false
    }

    let prevPoint = point

    // Code points higher than U+FFFF, i.e. 0xFFFF or 65535 in decimal, belong
    // to the astral planes which are represented by surrogate pairs and require
    // incrementing `i` by 2.
    // https://mathiasbynens.be/notes/javascript-unicode#unicode-basics
    while ((point = name.codePointAt(i += prevPoint > 0xFFFF ? 2 : 1)) !== void 0) {
      if (! isIdentifierChar(point, true)) {
        return false
      }

      prevPoint = point
    }

    return true
  }

  return isIdentifierName
}

export default shared.inited
  ? shared.module.utilIsIdentifierName
  : shared.module.utilIsIdentifierName = init()
