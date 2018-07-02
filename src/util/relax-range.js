import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    CIRCUMFLEX_ACCENT,
    DIGIT_0,
    DIGIT_9,
    EQUAL,
    LOWERCASE_V,
    TILDE
  } = CHAR_CODE

  function relaxRange(range) {
    if (typeof range !== "string") {
      return "*"
    }

    const code0 = range.charCodeAt(0)

    if (code0 !== CIRCUMFLEX_ACCENT) {
      if (code0 >= DIGIT_0 &&
          code0 <= DIGIT_9) {
        return "^" + range
      }

      if (code0 === TILDE ||
          code0 === LOWERCASE_V ||
          code0 === EQUAL) {
        return "^" + range.slice(1)
      }
    }

    return range
  }

  return relaxRange
}

export default shared.inited
  ? shared.module.utilRelaxRange
  : shared.module.utilRelaxRange = init()
