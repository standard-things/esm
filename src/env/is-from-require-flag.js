import hasLoaderModule from "./has-loader-module.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isFromRequireFlag() {
  const { env } = shared

  if ("isFromRequireFlag" in env) {
    return env.isFromRequireFlag
  }

  return env.isFromRequireFlag =
    rootModule.id === "internal/preload" &&
    hasLoaderModule(rootModule.children)
}

export default isFromRequireFlag
