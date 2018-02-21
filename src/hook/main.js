import Module from "../module.js"
import Package from "../package.js"

import assign from "../util/assign.js"
import builtinEntries from "../builtin-entries.js"
import call from "../util/call.js"
import { dirname } from "path"
import getSilent from "../util/get-silent.js"
import loadESM from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"
import shared from "../shared.js"

function hook(Mod) {
  const _tickCallback = getSilent(process, "_tickCallback")
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
      const pkg = new Package("", "*", { cache: false })
      const pkgOptions = pkg.options

      assign(pkg, defaultPkg)
      pkg.options = assign(pkgOptions, defaultPkg.options)
      Package.set(dirPath, pkg)
    }

    loadESM(filename, null, true)
    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      call(_tickCallback, process)
    }
  }
}

export default hook
