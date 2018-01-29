import hasLoaderValue from "./has-loader-value.js"
import parseJSON from "../util/parse-json.js"

const { isArray } = Array

function hasLoaderArg(args) {
  return isArray(args) &&
    args.some((arg) =>
      arg.charCodeAt(0) === 123 /* { */
        ? hasLoaderValue(parseJSON(arg))
        : hasLoaderValue(arg)
    )
}

export default hasLoaderArg
