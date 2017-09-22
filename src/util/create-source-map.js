import toStringLiteral from "./to-string-literal.js"

const newlineRegExp = /\n/g

function createSourceMap(filePath, content) {
  let lineCount = -1
  let mapping = ""

  while (newlineRegExp.test(content)) {
    mapping += (++lineCount ? ";" : "") + "AA" + (lineCount ? "C" : "A") + "A"
  }

  return '{"version":3,"sources":[' +
    toStringLiteral(filePath) +
    '],"names":[],"mappings":"' + mapping + '"}'
}

export default createSourceMap
