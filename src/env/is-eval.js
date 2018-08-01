import { argv } from "../safe/process.js"
import getFlags from "./get-flags.js"
import isPreloaded from "./is-preloaded.js"
import isPrint from "./is-print.js"
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
      getFlags().eval &&
      isPreloaded()
  }

  return isEval
}

export default shared.inited
  ? shared.module.envIsEval
  : shared.module.envIsEval = init()
