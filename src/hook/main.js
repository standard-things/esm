import { dirname, resolve } from "path"

import PkgInfo from "../pkg-info.js"

import _resolveFilename from "../module/esm/_resolve-filename.js"
import assign from "../util/assign.js"
import builtinModules from "../builtin-modules.js"
import isPath from "../util/is-path.js"
import loadESM from "../module/esm/load.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import parseJSON6 from "../util/parse-json6.js"
import readFile from "../fs/read-file.js"

function hook(Mod) {
  const _tickCallback = noDeprecationWarning(() => process._tickCallback)
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  const cwdPkgInfo = PkgInfo.get(".", true)
  let cwdOptions = cwdPkgInfo.options

  const defaultPkgInfo = new PkgInfo("", "", { cache: false })
  const defaultOptions = defaultPkgInfo.options

  let { ESM_OPTIONS } = process.env

  if (ESM_OPTIONS) {
    if (isPath(ESM_OPTIONS)) {
      ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
    }

    cwdOptions = PkgInfo.createOptions(parseJSON6(ESM_OPTIONS))
  }

  const mode = cwdOptions.esm

  assign(defaultPkgInfo, cwdPkgInfo)
  defaultPkgInfo.options = assign(defaultOptions, cwdOptions)
  defaultPkgInfo.options.esm = mode === "all" ? "js" : mode
  defaultPkgInfo.range = "*"

  Mod.runMain = () => {
    Mod.runMain = runMain

    const [, mainPath] = process.argv

    if (mainPath in builtinModules) {
      Mod.runMain()
      return
    }

    const filePath = _resolveFilename(mainPath, null, true)
    const dirPath = dirname(filePath)
    const pkgInfo = PkgInfo.get(dirPath) || defaultPkgInfo

    PkgInfo.set(dirPath, pkgInfo)

    loadESM(filePath, null, true)
    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      _tickCallback()
    }
  }
}

export default hook
