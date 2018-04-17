import PACKAGE from "../constant/package.js"

import Module from "../module.js"
import Package from "../package.js"

import assign from "../util/assign.js"
import builtinEntries from "../builtin-entries.js"
import call from "../util/call.js"
import { dirname } from "../safe/path.js"
import getSilent from "../util/get-silent.js"
import loadESM from "../module/esm/load.js"
import maskFunction from "../util/mask-function.js"
import realProcess from "../real/process.js"
import resolveFilename from "../module/esm/resolve-filename.js"
import shared from "../shared.js"

const {
  RANGE_ALL
} = PACKAGE

function hook(Mod) {
  const _tickCallback = getSilent(realProcess, "_tickCallback")
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  Mod.runMain = maskFunction(function () {
    Mod.runMain = runMain

    const [, mainPath] = realProcess.argv

    if (Reflect.has(builtinEntries, mainPath)) {
      Mod.runMain()
      return
    }

    let error
    let filename
    let threw = true

    try {
      filename = resolveFilename(mainPath, null, true)
      threw = false
    } catch (e) {
      error = e
    }

    if (threw) {
      try {
        filename = Module._resolveFilename(mainPath, null, true)
      } catch (e) {}
    }

    if (threw &&
        ! filename) {
      throw error
    }

    const defaultPkg = shared.package.default
    const dirPath = dirname(filename)

    if (Package.get(dirPath) === defaultPkg) {
      const pkg = new Package("", RANGE_ALL, { cache: false })
      const pkgOptions = pkg.options

      assign(pkg, defaultPkg)
      pkg.options = assign(pkgOptions, defaultPkg.options)
      Package.set(dirPath, pkg)
    }

    loadESM(filename, null, true)
    tickCallback()
  }, runMain)

  function tickCallback() {
    if (useTickCallback) {
      call(_tickCallback, realProcess)
    }
  }
}

export default hook
