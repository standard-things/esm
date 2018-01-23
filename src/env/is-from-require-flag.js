import hasLoaderModule from "./has-loader-module.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isFromRequireFlag() {
  if ("isFromRequireFlag" in shared.env) {
    return shared.env.isFromRequireFlag
  }

  return shared.env.isFromRequireFlag =
    (rootModule.id === "internal/preload" &&
     hasLoaderModule(rootModule.children)) ||
    noDeprecationWarning(() => hasLoaderModule(process._preloadModules))
}

export default isFromRequireFlag
