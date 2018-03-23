import hasLoaderModule from "./has-loader-module.js"
import isInternal from "./is-internal.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isPreloaded() {
  const { env } = shared

  if (Reflect.has(env, "preloaded")) {
    return env.preloaded
  }

  if (isInternal()) {
    return env.preloaded = true
  }

  return env.preloaded =
    rootModule.id === "internal/preload" &&
    hasLoaderModule(rootModule.children)
}

export default isPreloaded
