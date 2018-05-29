import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    CARRIAGE_RETURN
  } = CHAR_CODE

  function pad(code, newCode, oldStart, oldEnd) {
    const oldCode = code.slice(oldStart, oldEnd)
    const oldLines = oldCode.split("\n")
    const newLines = newCode.split("\n")
    const lastIndex = newLines.length - 1
    const { length } = oldLines

    let i = lastIndex - 1

    while (++i < length) {
      const oldLine = oldLines[i]
      const lastCharCode = oldLine.charCodeAt(oldLine.length - 1)

      if (i > lastIndex) {
        newLines[i] = ""
      }

      if (lastCharCode === CARRIAGE_RETURN) {
        newLines[i] += "\r"
      }
    }

    return newLines.join("\n")
  }

  return pad
}

export default shared.inited
  ? shared.module.parsePad
  : shared.module.parsePad = init()
