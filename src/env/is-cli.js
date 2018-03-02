import isPreloaded from "./is-preloaded.js"
import isSideloaded from "./is-sideloaded.js"
import shared from "../shared.js"

function isCLI() {
  const { env } = shared

  if (Reflect.has(env, "cli")) {
    return env.cli
  }

  if (process.argv.length > 1 &&
      isPreloaded()) {
    return env.cli = true
  }

  return env.cli = isSideloaded()
}

export default isCLI
