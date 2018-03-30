import hasLoaderModule from "./has-loader-module.js"
import isPreloaded from "./is-preloaded.js"
import realProcess from "../real/process.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isREPL() {
  const { env } = shared

  if (Reflect.has(env, "repl")) {
    return env.repl
  }

  if (realProcess.argv.length !== 1) {
    return env.repl = false
  }

  if (isPreloaded()) {
    return env.repl = true
  }

  return env.repl =
    rootModule.id === "<repl>" &&
    rootModule.filename === null &&
    rootModule.loaded === false &&
    rootModule.parent == null &&
    hasLoaderModule(rootModule.children)
}

export default isREPL

