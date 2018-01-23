import hasLoaderValue from "./has-loader-value.js"
import parseJSON from "../util/parse-json.js"

const codeOfLeftBracket = "{".charCodeAt(0)

function hasLoaderArg(args) {
  return args.some((arg) =>
    arg.charCodeAt(0) === codeOfLeftBracket
      ? hasLoaderValue(parseJSON(arg))
      : hasLoaderValue(arg)
  )
}

export default hasLoaderArg
