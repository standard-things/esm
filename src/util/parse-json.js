import shared from "../shared.js"

function init() {
  function parseJSON(string) {
    if (typeof string === "string" &&
        string.length) {
      try {
        return JSON.parse(string)
      } catch {}
    }

    return null
  }

  return parseJSON
}

export default shared.inited
  ? shared.module.utilParseJSON
  : shared.module.utilParseJSON = init()
