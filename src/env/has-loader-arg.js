import CHAR_CODE from "../constant/char-code.js"

import GenericArray from "../generic/array.js"

import hasLoaderValue from "./has-loader-value.js"
import parseJSON from "../util/parse-json.js"

const {
  LEFT_CURLY_BRACKET
} = CHAR_CODE

function hasLoaderArg(args) {
  if (! Array.isArray(args)) {
    return false
  }

  return GenericArray.some(args, (arg) => {
    return arg.charCodeAt(0) === LEFT_CURLY_BRACKET
      ? hasLoaderValue(parseJSON(arg))
      : hasLoaderValue(arg)
  })
}

export default hasLoaderArg
