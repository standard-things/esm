import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import { dirname } from "path"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(Module) {
  const { _tickCallback, argv } = process
  const [, mainPath] = argv
  const { runMain } = Module

  Module.runMain = function () {
    Module.runMain = runMain

    let options = { isMain: true }
    const filePath = resolveFilename(mainPath, null, options)
    const pkgInfo = PkgInfo.get(dirname(filePath))

    if (pkgInfo === null) {
      Module.runMain()
      return
    }

    assign(options, pkgInfo.options)
    moduleLoad(filePath, null, options)
    tryTickCallback()
  }

  function tryTickCallback() {
    try {
      _tickCallback.call(process)
    } catch (e) {}
  }
}

export default hook
