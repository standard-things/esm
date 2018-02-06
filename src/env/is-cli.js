import isPreloaded from "./is-preloaded.js"
import isSideloaded from "./is-sideloaded.js"
import shared from "../shared.js"

function isCLI() {
  const { env } = shared

  if ("cli" in env) {
    return env.cli
  }

  return env.cli =
    (process.argv.length > 1 &&
      isPreloaded()) ||
    isSideloaded()
}

export default isCLI
