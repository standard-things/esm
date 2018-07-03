import { argv } from "../safe/process.js"
import isPreloaded from "./is-preloaded.js"
import shared from "../shared.js"

function init() {
  function isCLI() {
    const { env } = shared

    if (Reflect.has(env, "cli")) {
      return env.cli
    }

    return env.cli =
      argv.length > 1 &&
      isPreloaded()
  }

  return isCLI
}

export default shared.inited
  ? shared.module.envIsCLI
  : shared.module.envIsCLI = init()
