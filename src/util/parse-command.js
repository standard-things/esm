import shared from "../shared.js"

function init() {
  // Regexes in Depth: Advanced Quoted String Matching
  // http://blog.stevenlevithan.com/archives/match-quoted-string
  const parseRegExp = /(?:[^ "'\\]|\\.)*(["'])(?:(?!\1)[^\\]|\\.)*\1|(?:[^ "'\\]|\\.)+/g

  function parseCommand(string) {
    const result = []

    if (typeof string === "string") {
      let match

      while ((match = parseRegExp.exec(string)) !== null) {
        result.push(match[0])
      }
    }

    return result
  }

  return parseCommand
}

export default shared.inited
  ? shared.module.utilParseCommand
  : shared.module.utilParseCommand = init()
