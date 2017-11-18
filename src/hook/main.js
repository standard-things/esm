import builtinModules from "../builtin-modules.js"
import loadESM from "../module/esm/load.js"

const { setPrototypeOf } = Object

function hook(Mod) {
  const { _tickCallback } = process
  const [, mainPath] = process.argv
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  Mod.runMain = () => {
    Mod.runMain = runMain

    if (mainPath in builtinModules) {
      Mod.runMain()
      return
    }

    loadESM(filePath, null, true, (mod) => {
      setPrototypeOf(mod, Mod.prototype)
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
