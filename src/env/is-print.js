import { argv, execArgv } from "../safe/process.js"

import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isPrint() {
  const { env } = shared

  if (Reflect.has(env, "print")) {
    return env.print
  }

  return env.print =
    argv.length === 1 &&
    matches(execArgv, /^(?:--print|-pe?)$/) &&
    isPreloaded()
}

export default isPrint

