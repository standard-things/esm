import CHAR_CODE from "../constant/char-code.js"

import hasLoaderValue from "./has-loader-value.js"
import matches from "../util/matches.js"
import parseJSON from "../util/parse-json.js"
import shared from "../shared.js"

function init() {
  const {
    LEFT_CURLY_BRACKET
  } = CHAR_CODE

  function hasLoaderArg(args) {
    return matches(args, (arg) => {
      return arg.charCodeAt(0) === LEFT_CURLY_BRACKET
        ? hasLoaderValue(parseJSON(arg))
        : hasLoaderValue(arg)
    })
  }

  return hasLoaderArg
}

export default shared.inited
  ? shared.module.envHasLoaderArg
  : shared.module.envHasLoaderArg = init()
