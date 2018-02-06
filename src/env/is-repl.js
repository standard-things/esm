import hasLoaderModule from "./has-loader-module.js"
import isFromRequireFlag from "./is-from-require-flag.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isREPL() {
  const { env } = shared

  if ("isRepl" in env) {
    return env.isREPL
  }

  return env.isREPL =
    (process.argv.length === 1 &&
     isFromRequireFlag()) ||
    (rootModule.id === "<repl>" &&
     rootModule.filename === null &&
     rootModule.loaded === false &&
     rootModule.parent == null &&
     hasLoaderModule(rootModule.children))
}

export default isREPL

