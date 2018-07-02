import { parse } from "json-6"
import shared from "../shared.js"

function init() {
  function parseJSON6(string) {
    try {
      return parse(string)
    } catch (e) {}

    return null
  }

  return parseJSON6
}

export default shared.inited
  ? shared.module.utilParseJSON6
  : shared.module.utilParseJSON6 = init()
