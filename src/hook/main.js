import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import loadESM from "../module/esm/load.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import resolveFilename from "../module/esm/resolve-filename.js"

const { setPrototypeOf } = Object

function hook(Mod) {
  const _tickCallback = noDeprecationWarning(() => process._tickCallback)
  const [, mainPath] = process.argv
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  const cwdPkgInfo = PkgInfo.get(".")
  const defaultPkgInfo = new PkgInfo("", "*", { cache: false })

  if (cwdPkgInfo) {
    const cwdOptions = cwdPkgInfo.options
    const defaultOptions = defaultPkgInfo.options
    const mode = cwdOptions.esm

    assign(defaultPkgInfo, cwdPkgInfo)
    defaultPkgInfo.options = assign(defaultOptions, cwdOptions)
    defaultPkgInfo.options.esm = mode === "all" ? "js" : mode
    defaultPkgInfo.range = "*"
  }

  Mod.runMain = () => {
    Mod.runMain = runMain

    if (mainPath in builtinModules) {
      Mod.runMain()
      return
    }

    const filePath = resolveFilename(mainPath, null, true)
    const dirPath = dirname(filePath)
    const pkgInfo = PkgInfo.get(dirPath) || defaultPkgInfo

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
