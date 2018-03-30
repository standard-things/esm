import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function isCheck() {
  const { env } = shared

  if (Reflect.has(env, "check")) {
    return env.check
  }

  const { length } = realProcess.argv

  return env.check =
    (length === 1 ||
     length === 2) &&
    matches(realProcess.execArgv, /^(?:--check|-c)$/) &&
    isPreloaded()
}

export default isCheck

