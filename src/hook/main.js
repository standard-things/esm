import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import builtinEntries from "../builtin-entries.js"
import { dirname } from "path"
import loadESM from "../module/esm/load.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(Mod) {
  const _tickCallback = noDeprecationWarning(() => process._tickCallback)
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  Mod.runMain = () => {
    Mod.runMain = runMain

    const [, mainPath] = process.argv

    if (mainPath in builtinEntries) {
      Mod.runMain()
      return
    }

    let error
    let filePath
    let threw = true

    try {
      filePath = resolveFilename(mainPath, null, true)
      threw = false
    } catch (e) {
      error = e
    }

    if (threw) {
      try {
        filePath = Module._resolveFilename(mainPath, null, true)
      } catch (e) {}
    }

    if (threw &&
        ! filePath) {
      throw error
    }

    const { defaultPkgInfo } = PkgInfo
    const dirPath = dirname(filePath)

    if (PkgInfo.get(dirPath) === defaultPkgInfo) {
      const pkgInfo = new PkgInfo("", "*", { cache: false })
      const pkgOptions = pkgInfo.options

      assign(pkgInfo, defaultPkgInfo)
      pkgInfo.options = assign(pkgOptions, defaultPkgInfo.options)
      PkgInfo.set(dirPath, pkgInfo)
    }

    loadESM(filePath, null, true)
    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      _tickCallback.call(process)
    }
  }
}

export default hook
