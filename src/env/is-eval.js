import isFromRequireFlag from "./is-from-require-flag.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isEval() {
  const { env } = shared

  if ("isEval" in env) {
    return env.isEval
  }

  return env.isEval =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--eval|--print|-pe|-[ep])$/) &&
    isFromRequireFlag()
}

export default isEval

