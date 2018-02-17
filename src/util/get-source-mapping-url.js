// Inspired by `findMagicComment` in
// https://chromium.googlesource.com/v8/v8.git/+/master/src/inspector/search-util.cc.

import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"

const {
  APOSTROPHE,
  AT,
  EQ,
  HT,
  NUMSIGN,
  QUOTE,
  SPACE,
  SLASH
} = ASCII

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
    pos = GenericString.lastIndexOf(content, name, pos)

    if (pos === -1 ||
        pos < 4) {
      return ""
    }

    const equalPos = pos + nameLength
    const urlPos = equalPos + 1

    pos -= 4

    // Codeify the regexp check, /\/\/[@#][ \t]/, before the name.
    if (GenericString.charCodeAt(content, pos) !== SLASH ||
        GenericString.charCodeAt(content, pos + 1) !== SLASH) {
      continue
    }

    let code = GenericString.charCodeAt(content, pos + 2)

    if (code !== AT &&
        code !== NUMSIGN) {
      continue
    }

    code = GenericString.charCodeAt(content, pos + 3)

    if (code !== HT &&
        code !== SPACE) {
      continue
    }

    // Check for "=" after the name.
    if (equalPos < length &&
      GenericString.charCodeAt(content, equalPos) !== EQ) {
      continue
    }

    if (urlPos === length) {
      return ""
    }

    match = GenericString.slice(content, urlPos)
  }

  const newLinePos = GenericString.indexOf(match, "\n")

  if (newLinePos !== -1) {
    match = GenericString.slice(match, 0, newLinePos)
  }

  match = GenericString.trim(match)

  let i = -1
  const matchLength = match.length

  while (++i < matchLength) {
    const code = GenericString.charCodeAt(match, i)

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
