import getURLFromFilePath from "./get-url-from-file-path.js"
import isPath from "./is-path.js"
import shared from "../shared.js"
import toStringLiteral from "./to-string-literal.js"

function init() {
  const newlineRegExp = /\n/g

  function createSourceMap(filename, content) {
    if (! isPath(filename)) {
      return ""
    }

    let lineCount = 0
    let mapping = ""

    while (lineCount === 0 ||
           newlineRegExp.test(content)) {
      mapping += (lineCount ? ";" : "") + "AA" + (lineCount ? "C" : "A") + "A"
      lineCount += 1
    }

    return '{"version":3,"sources":[' +
      toStringLiteral(getURLFromFilePath(filename)) +
      '],"names":[],"mappings":"' + mapping + '"}'
  }

  return createSourceMap
}

export default shared.inited
  ? shared.module.utilCreateSourceMap
  : shared.module.utilCreateSourceMap = init()
