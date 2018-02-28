import hasLoaderModule from "./has-loader-module.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isPreloaded() {
  const { env } = shared

  if (Reflect.has(env, "preloaded")) {
    return env.preloaded
  }

  return env.preloaded =
    rootModule.id === "internal/preload" &&
    hasLoaderModule(rootModule.children)
}

export default isPreloaded
