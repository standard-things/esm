import { argv, execArgv } from "../safe/process.js"

import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function init() {
  function isCheck() {
    const { env } = shared

    if (Reflect.has(env, "check")) {
      return env.check
    }

    const { length } = argv

    return env.check =
      (length === 1 ||
      length === 2) &&
      matches(execArgv, /^(?:--check|-c)$/) &&
      isPreloaded()
  }

  return isCheck
}

export default shared.inited
  ? shared.module.envIsCheck
  : shared.module.envIsCheck = init()

