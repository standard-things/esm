import isFromPackage from "./is-from-package.js"
import isFromRequireFlag from "./is-from-require-flag.js"
import shared from "../shared.js"

function isCLI() {
  const { env } = shared

  if ("isCLI" in env) {
    return env.isCLI
  }

  return env.isCLI =
    (process.argv.length > 1 &&
     isFromRequireFlag()) ||
    isFromPackage()
}

export default isCLI
