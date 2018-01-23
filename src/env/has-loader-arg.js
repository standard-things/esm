import hasLoaderValue from "./has-loader-value.js"
import parseJSON from "../util/parse-json.js"

function hasLoaderArg(args) {
  return args.some((arg) =>
    arg.charCodeAt(0) === 123 /* { */
      ? hasLoaderValue(parseJSON(arg))
      : hasLoaderValue(arg)
  )
}

export default hasLoaderArg
