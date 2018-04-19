// Based on Node's `stripBOM`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import CHAR_CODE from "../constant/char-code.js"

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

export default stripBOM
