import { argv, execArgv } from "../safe/process.js"

import isPreloaded from "./is-preloaded.js"
import isPrint from "./is-print.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function init() {
  function isEval() {
    const { env } = shared

    if (Reflect.has(env, "eval")) {
      return env.eval
    }

    if (isPrint()) {
      return env.eval = true
    }

    return env.eval =
      argv.length === 1 &&
      matches(execArgv, /^(?:--eval|-e)$/) &&
      isPreloaded()
  }

  return isEval
}

export default shared.inited
  ? shared.module.envIsEval
  : shared.module.envIsEval = init()
