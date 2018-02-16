// Inspired by `findMagicComment` in
// https://chromium.googlesource.com/v8/v8.git/+/master/src/inspector/search-util.cc.

import GenericString from "../generic/string.js"

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
    if (GenericString.charCodeAt(content, pos) !== 47 /* / */ ||
        GenericString.charCodeAt(content, pos + 1) !== 47 /* / */) {
      continue
    }

    let code = GenericString.charCodeAt(content, pos + 2)

    if (code !== 35 /* # */ &&
        code !== 64 /* @ */) {
      continue
    }

    code = GenericString.charCodeAt(content, pos + 3)

    if (code !== 32 /* <space> */ &&
        code !== 9 /* \t */) {
      continue
    }

    // Check for "=" after the name.
    if (equalPos < length &&
      GenericString.charCodeAt(content, equalPos) !== 61 /* = */) {
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

    if (code === 34 /* " */ ||
        code === 39 /* ' */ ||
        code === 32 /* <space> */ ||
        code === 9 /* \t */) {
      return ""
    }
  }

  return match
}

export default getSourceMappingURL
