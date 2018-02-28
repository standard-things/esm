import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isCheck() {
  const { env } = shared

  if (Reflect.has(env, "check")) {
    return env.check
  }

  return env.check =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--check|-c)$/) &&
    isPreloaded()
}

export default isCheck

