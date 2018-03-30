import isPreloaded from "./is-preloaded.js"
import isPrint from "./is-print.js"
import matches from "../util/matches.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function isEval() {
  const { env } = shared

  if (Reflect.has(env, "eval")) {
    return env.eval
  }

  if (isPrint()) {
    return env.eval = true
  }

  return env.eval =
    realProcess.argv.length === 1 &&
    matches(realProcess.execArgv, /^(?:--eval|-e)$/) &&
    isPreloaded()
}

export default isEval

