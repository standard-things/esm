import hasLoaderModule from "./has-loader-module.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isFromRequireFlag() {
  if ("isFromRequireFlag" in shared.env) {
    return shared.env.isFromRequireFlag
  }

  const _preloadModules = noDeprecationWarning(() => process._preloadModules)

  return shared.env.isFromRequireFlag =
    hasLoaderModule(_preloadModules) ||
    (rootModule.id === "internal/preload" &&
     hasLoaderModule(rootModule.children))
}

export default isFromRequireFlag
