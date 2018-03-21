import toStringLiteral from "./to-string-literal.js"

const newlineRegExp = /\n/g

function createSourceMap(filename, content) {
  let lineCount = 0
  let mapping = ""

  while (! lineCount ||
      newlineRegExp.test(content)) {
    mapping += (lineCount ? ";" : "") + "AA" + (lineCount ? "C" : "A") + "A"
    lineCount += 1
  }

  return '{"version":3,"sources":[' +
    toStringLiteral(filename) +
    '],"names":[],"mappings":"' + mapping + '"}'
}

export default createSourceMap
