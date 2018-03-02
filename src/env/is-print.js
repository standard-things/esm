import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isPrint() {
  const { env } = shared

  if (Reflect.has(env, "print")) {
    return env.print
  }

  return env.print =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--print|-pe?)$/) &&
    isPreloaded()
}

export default isPrint

