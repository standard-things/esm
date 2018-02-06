import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isEval() {
  const { env } = shared

  if ("eval" in env) {
    return env.eval
  }

  return env.eval =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--eval|--print|-pe|-[ep])$/) &&
    isPreloaded()
}

export default isEval

