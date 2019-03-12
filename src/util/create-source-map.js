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
      // Each segment has 4 VLQ fields. They are:
      //  - The starting column index of the current line.
      //  - The index of the source file.
      //  - The starting line index in the source that this segment
      //    corresponds to, relative to the previous value.
      //  - The starting column index in the source that this segment
      //    corresponds to, relative to the previous value.
      //
      // Integer to VLQ value map:
      //  0 -> "A"
      //  1 -> "C"
      //
      // For more details see
      // https://sourcemaps.info/spec.html#h.qz3o9nc69um5 and
      // https://github.com/Rich-Harris/vlq#what-is-a-vlq-string.
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
