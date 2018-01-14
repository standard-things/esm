import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import builtinEntries from "../builtin-entries.js"
import { dirname } from "path"
import env from "../env.js"
import loadESM from "../module/esm/load.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(Mod) {
  const _tickCallback = noDeprecationWarning(() => process._tickCallback)
  const { runMain } = Mod

  const cwd = process.cwd()
  const useTickCallback = typeof _tickCallback === "function"

  let cwdPkgInfo = PkgInfo.get(cwd)
  const defaultPkgInfo = new PkgInfo("", "*", { cache: false })
  const defaultOptions = defaultPkgInfo.options

  if (! cwdPkgInfo) {
    cwdPkgInfo = PkgInfo.get(cwd, true)
    PkgInfo.set(cwd, defaultPkgInfo)
  }

  assign(defaultPkgInfo, cwdPkgInfo)
  defaultPkgInfo.options = assign(defaultOptions, cwdPkgInfo.options)
  defaultPkgInfo.range = "*"

  if (env.vars.ESM_OPTIONS) {
    assign(defaultPkgInfo.options, PkgInfo.createOptions(env.vars.ESM_OPTIONS))
  }

  if (defaultPkgInfo.options.esm === "all") {
    defaultPkgInfo.options.esm = "js"
  }

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

    const dirPath = dirname(filePath)
    const pkgInfo = PkgInfo.get(dirPath) || defaultPkgInfo

    PkgInfo.set(dirPath, pkgInfo)

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
