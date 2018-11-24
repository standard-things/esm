import hasLoaderModule from "./has-loader-module.js"
import isInternal from "./is-internal.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function init() {
  function isPreloaded() {
    if (isInternal()) {
      return true
    }

    return rootModule.id === "internal/preload" &&
      hasLoaderModule(rootModule.children)
  }

  return isPreloaded
}

export default shared.inited
  ? shared.module.envIsPreloaded
  : shared.module.envIsPreloaded = init()
