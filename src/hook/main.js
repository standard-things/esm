import PkgInfo from "../pkg-info.js"

import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import loadESM from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

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

    const filePath = resolveFilename(mainPath, null, true)
    const pkgInfo = PkgInfo.get(dirname(filePath))

    if (pkgInfo === null) {
      Module.runMain()
      return
    }

    loadESM(filePath, null, true, (mod) => {
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
