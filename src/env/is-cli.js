import isFromPackage from "./is-from-package.js"
import isFromRequireFlag from "./is-from-require-flag.js"
import shared from "../shared.js"

function isCLI() {
  if ("isCLI" in shared.env) {
    return shared.env.isCLI
  }

  return shared.env.isCLI =
    (process.argv.length > 1 &&
     isFromRequireFlag()) ||
    isFromPackage()
}

export default isCLI
