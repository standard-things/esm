import GenericArray from "../generic/array.js"
import GenericString from "../generic/string.js"

import hasLoaderValue from "./has-loader-value.js"
import parseJSON from "../util/parse-json.js"

function hasLoaderArg(args) {
  if (! GenericArray.isArray(args)) {
    return false
  }

  return GenericArray.some(args, (arg) => {
    return GenericString.charCodeAt(arg, 0) === 123 /* { */
      ? hasLoaderValue(parseJSON(arg))
      : hasLoaderValue(arg)
  })
}

export default hasLoaderArg
