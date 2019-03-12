// Inspired by `findMagicComment()`.
// https://chromium.googlesource.com/v8/v8.git/+/master/src/inspector/search-util.cc

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    APOSTROPHE,
    AT,
    EQUAL,
    FORWARD_SLASH,
    NUMSIGN,
    QUOTE,
    SPACE,
    TAB
  } = CHAR_CODE

  const NAME = "sourceMappingURL"
  const NAME_LENGTH = NAME.length
  const MIN_LENGTH = NAME_LENGTH + 6

  function getSourceMappingURL(content) {
    if (typeof content !== "string") {
      return ""
    }

    const { length } = content

    if (length < MIN_LENGTH) {
      return ""
    }

    let match = null
    let pos = length

    while (match === null) {
      pos = content.lastIndexOf(NAME, pos)

      if (pos === -1 ||
          pos < 4) {
        return ""
      }

      const equalPos = pos + NAME_LENGTH
      const urlPos = equalPos + 1

      pos -= 4

      // Codeify the regexp check, /\/\/[@#][ \t]/, before `NAME`.
      if (content.charCodeAt(pos) !== FORWARD_SLASH ||
          content.charCodeAt(pos + 1) !== FORWARD_SLASH) {
        continue
      }

      let code = content.charCodeAt(pos + 2)

      if (code !== AT &&
          code !== NUMSIGN) {
        continue
      }

      code = content.charCodeAt(pos + 3)

      if (code !== SPACE &&
          code !== TAB) {
        continue
      }

      // Check for "=" after `NAME`.
      if (equalPos < length &&
        content.charCodeAt(equalPos) !== EQUAL) {
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

    const matchLength = match.length

    let i = -1

    while (++i < matchLength) {
      const code = match.charCodeAt(i)

      if (code === APOSTROPHE ||
          code === QUOTE ||
          code === SPACE ||
          code === TAB) {
        return ""
      }
    }

    return match
  }

  return getSourceMappingURL
}

export default shared.inited
  ? shared.module.utilGetSourceMappingURL
  : shared.module.utilGetSourceMappingURL = init()
