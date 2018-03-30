import isPreloaded from "./is-preloaded.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function isCLI() {
  const { env } = shared

  if (Reflect.has(env, "cli")) {
    return env.cli
  }

  return env.cli =
    realProcess.argv.length > 1 &&
    isPreloaded()
}

export default isCLI
