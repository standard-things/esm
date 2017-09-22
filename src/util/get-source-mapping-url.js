const codeOfDoubleQuote = '"'.charCodeAt(0)
const codeOfEqual = "=".charCodeAt(0)
const codeOfPound = "#".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)
const codeOfSingleQuote = "'".charCodeAt(0)
const codeOfSpace = " ".charCodeAt(0)
const codeOfTab = "\t".charCodeAt(0)

const name = "sourceMappingURL"
const nameLength = name.length
const minLength = nameLength + 6
const { trim } = String.prototype

function getSourceMappingURL(content) {
  const { length } = content

  let match
  let pos = length

  if (length < minLength) {
    return ""
  }

  while (true) {
    pos = content.lastIndexOf(name, pos)

    if (pos === -1 ||
        pos < 4) {
      return ""
    }

    // Check for "//# " before the name.
    if (content.charCodeAt(pos - 4) !== codeOfSlash ||
        content.charCodeAt(pos - 3) !== codeOfSlash ||
        content.charCodeAt(pos - 2) !== codeOfPound) {
      continue
    }

    const code = content.charCodeAt(pos - 1)

    if (code !== codeOfSpace &&
        code !== codeOfTab) {
      continue
    }

    const equalPos = pos + nameLength
    const urlPos = equalPos + 1

    // Check for "=..." after the name.
    if (urlPos < length) {
      if (content.charCodeAt(equalPos) !== codeOfEqual) {
        continue
      }
    } else {
      return ""
    }

    match = content.slice(urlPos)
    break
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

    if (code === codeOfDoubleQuote ||
        code === codeOfSingleQuote ||
        code === codeOfSpace ||
        code === codeOfTab) {
      return ""
    }
  }

  return match
}

export default getSourceMappingURL
