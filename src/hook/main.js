import PkgInfo from "../pkg-info.js"

import { dirname } from "path"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(Module) {
  const { _tickCallback, argv } = process
  const mainPath = argv[1]
  const { runMain } = Module

  Module.runMain = function () {
    Module.runMain = runMain

    const filePath = resolveFilename(mainPath, null, { isMain: true })
    const pkgInfo = PkgInfo.get(dirname(filePath))

    if (pkgInfo === null) {
      Module.runMain()
      return
    }

    moduleLoad(filePath, null, true)
    tryTickCallback()
  }

  function tryTickCallback() {
    try {
      _tickCallback()
    } catch (e) {}
  }
}

export default hook
