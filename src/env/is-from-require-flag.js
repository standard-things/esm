import hasLoaderModule from "./has-loader-module.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isFromRequireFlag() {
  if ("isFromRequireFlag" in shared.env) {
    return shared.env.isFromRequireFlag
  }

  return shared.env.isFromRequireFlag =
    rootModule.id === "internal/preload" &&
    hasLoaderModule(rootModule.children)
}

export default isFromRequireFlag
