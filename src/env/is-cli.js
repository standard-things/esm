import { argv } from "../safe/process.js"
import isPreloaded from "./is-preloaded.js"
import shared from "../shared.js"

function isCLI() {
  const { env } = shared

  if (Reflect.has(env, "cli")) {
    return env.cli
  }

  return env.cli =
    argv.length > 1 &&
    isPreloaded()
}

export default isCLI
