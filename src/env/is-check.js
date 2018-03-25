import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isCheck() {
  const { env } = shared

  if (Reflect.has(env, "check")) {
    return env.check
  }

  const { length } = process.argv

  return env.check =
    (length === 1 ||
     length === 2) &&
    matches(process.execArgv, /^(?:--check|-c)$/) &&
    isPreloaded()
}

export default isCheck

