import builtinModules from "../builtin-modules.js"
import loadESM from "../module/esm/load.js"

const { setPrototypeOf } = Object

function hook(Module) {
  const { _tickCallback } = process
  const [, mainPath] = process.argv
  const { runMain } = Module

  const useTickCallback = typeof _tickCallback === "function"

  Module.runMain = () => {
    Module.runMain = runMain

    if (mainPath in builtinModules) {
      Module.runMain()
      return
    }

    loadESM(mainPath, null, true, (mod) => {
      setPrototypeOf(mod, Module.prototype)
    })

    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      _tickCallback()
    }
  }
}

export default hook
