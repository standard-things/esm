import {
  createWordsRegExp,
  isIdentifierChar,
  isIdentifierStart,
  reservedWords
} from "../acorn.js"

import shared from "../shared.js"

function init() {
  const reservedWordsStrictBindRegExp = createWordsRegExp(
    "await " +
    reservedWords[6] + " " +
    reservedWords.strict + " " +
    reservedWords.strictBind
  )

  function isBindingName(name) {
    if (typeof name !== "string" ||
        name.length === 0 ||
        reservedWordsStrictBindRegExp.test(name)) {
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

  return isBindingName
}

export default shared.inited
  ? shared.module.utilIsBindingName
  : shared.module.utilIsBindingName = init()
