// Inspired by `findMagicComment` in
// https://chromium.googlesource.com/v8/v8.git/+/master/src/inspector/search-util.cc.

import CHAR_CODE from "../constant/char-code.js"

const {
  APOSTROPHE,
  AT,
  EQ,
  HT,
  NUMSIGN,
  QUOTE,
  SPACE,
  SLASH
} = CHAR_CODE

const name = "sourceMappingURL"
const nameLength = name.length
const minLength = nameLength + 6

function getSourceMappingURL(content) {
  if (typeof content !== "string") {
    return ""
  }

  const { length } = content

  if (length < minLength) {
    return ""
  }

  let match = null
  let pos = length

  while (match === null) {
    pos = content.lastIndexOf(name, pos)

    if (pos === -1 ||
        pos < 4) {
      return ""
    }

    const equalPos = pos + nameLength
    const urlPos = equalPos + 1

    pos -= 4

    // Codeify the regexp check, /\/\/[@#][ \t]/, before the name.
    if (content.charCodeAt(pos) !== SLASH ||
        content.charCodeAt(pos + 1) !== SLASH) {
      continue
    }

    let code = content.charCodeAt(pos + 2)

    if (code !== AT &&
        code !== NUMSIGN) {
      continue
    }

    code = content.charCodeAt(pos + 3)

    if (code !== HT &&
        code !== SPACE) {
      continue
    }

    // Check for "=" after the name.
    if (equalPos < length &&
      content.charCodeAt(equalPos) !== EQ) {
      continue
    }

    if (urlPos === length) {
      return ""
    }

    match = content.slice(urlPos)
  }

  const newLinePos = match.indexOf("\n")

  if (newLinePos !== -1) {
    match = match.slice(0, newLinePos)
  }

  match = match.trim()

  let i = -1
  const matchLength = match.length

  while (++i < matchLength) {
    const code = match.charCodeAt(i)

    if (code === APOSTROPHE ||
        code === HT ||
        code === QUOTE ||
        code === SPACE) {
      return ""
    }
  }

  return match
}

export default getSourceMappingURL
