import { argv } from "../safe/process.js"
import hasLoaderModule from "./has-loader-module.js"
import isPreloaded from "./is-preloaded.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function init() {
  function isREPL() {
    if (argv.length !== 1) {
      return false
    }

    if (isPreloaded()) {
      return true
    }

    return rootModule.id === "<repl>" &&
      rootModule.filename === null &&
      rootModule.loaded === false &&
      rootModule.parent == null &&
      hasLoaderModule(rootModule.children)
  }

  return isREPL
}

export default shared.inited
  ? shared.module.envIsREPL
  : shared.module.envIsREPL = init()
