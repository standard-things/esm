import hasLoaderModule from "./has-loader-module.js"
import isFromRequireFlag from "./is-from-require-flag.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function isREPL() {
  if ("isRepl" in shared.env) {
    return shared.env.isREPL
  }

  return shared.env.isREPL =
    (process.argv.length < 2 &&
     isFromRequireFlag()) ||
    (rootModule.id === "<repl>" &&
     rootModule.filename === null &&
     rootModule.loaded === false &&
     rootModule.parent == null &&
     hasLoaderModule(rootModule.children))
}

export default isREPL

