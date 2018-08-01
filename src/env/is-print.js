import { argv } from "../safe/process.js"
import getFlags from "./get-flags.js"
import isPreloaded from "./is-preloaded.js"
import shared from "../shared.js"

function init() {
  function isPrint() {
    const { env } = shared

    if (Reflect.has(env, "print")) {
      return env.print
    }

    return env.print =
      argv.length === 1 &&
      getFlags().print &&
      isPreloaded()
  }

  return isPrint
}

export default shared.inited
  ? shared.module.envIsPrint
  : shared.module.envIsPrint = init()
