import PkgInfo from "../pkg-info.js"

import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import loadESM from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

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

    const filePath = resolveFilename(mainPath, null, true)
    const dirPath = dirname(filePath)
    const pkgInfo = PkgInfo.get(dirPath) || PkgInfo.get(".")

    PkgInfo.set(dirPath, pkgInfo)

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
