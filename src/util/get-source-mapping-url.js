// Inspired by `findMagicComment` in
// https://chromium.googlesource.com/v8/v8.git/+/master/src/inspector/search-util.cc.

const name = "sourceMappingURL"
const nameLength = name.length
const minLength = nameLength + 6
const { trim } = String.prototype

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
    if (content.charCodeAt(pos) !== 47 /* / */ ||
        content.charCodeAt(pos + 1) !== 47 /* / */) {
      continue
    }

    let code = content.charCodeAt(pos + 2)

    if (code !== 35 /* # */ &&
        code !== 64 /* @ */) {
      continue
    }

    code = content.charCodeAt(pos + 3)

    if (code !== 32 /* <space> */ &&
        code !== 9 /* \t */) {
      continue
    }

    // Check for "=" after the name.
    if (equalPos < length &&
        content.charCodeAt(equalPos) !== 61 /* = */) {
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

  match = trim.call(match)

  let i = -1
  const matchLength = match.length

  while (++i < matchLength) {
    const code = match.charCodeAt(i)

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
