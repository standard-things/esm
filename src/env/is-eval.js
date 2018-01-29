import isFromRequireFlag from "./is-from-require-flag.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isEval() {
  if ("isEval" in shared.env) {
    return shared.env.isEval
  }

  return shared.env.isEval =
    process.argv.length < 2 &&
    isFromRequireFlag() &&
    matches(process.execArgv, /^(?:--eval|--print|-pe|-[ep])$/)
}

export default isEval

