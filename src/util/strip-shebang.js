// Based on Node's `stripShebang`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import CHAR_CODE from "../constant/char-code.js"

const {
  NUMSIGN
} = CHAR_CODE

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  return string.charCodeAt(0) === NUMSIGN
    ? string.replace(shebangRegExp, "")
    : string
}

export default stripShebang
