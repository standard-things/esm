import { parse } from "json-6"
import quotifyJSON from "./quotify-json.js"
import shared from "../shared.js"

function init() {
  function parseJSON6(string) {
    return tryParse(string) ||
           tryParse(quotifyJSON(string))
  }

  function tryParse(string) {
    if (typeof string === "string" &&
        string.length) {
      try {
        return parse(string)
      } catch {}
    }

    return null
  }

  return parseJSON6
}

export default shared.inited
  ? shared.module.utilParseJSON6
  : shared.module.utilParseJSON6 = init()
