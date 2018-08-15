// Based on `stripBOM()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    ZERO_WIDTH_NOBREAK_SPACE
  } = CHAR_CODE

  function stripBOM(string) {
    if (typeof string !== "string") {
      return ""
    }

    return string.charCodeAt(0) === ZERO_WIDTH_NOBREAK_SPACE
      ? string.slice(1)
      : string
  }

  return stripBOM
}

export default shared.inited
  ? shared.module.utilStripBOM
  : shared.module.utilStripBOM = init()
