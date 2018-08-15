// Based on `stripShebang()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
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

  return stripShebang
}

export default shared.inited
  ? shared.module.utilStripShebang
  : shared.module.utilStripShebang = init()
