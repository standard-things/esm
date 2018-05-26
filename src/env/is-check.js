import { argv, execArgv } from "../safe/process.js"

import isPreloaded from "./is-preloaded.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

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

export default isCheck

