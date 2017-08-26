import PkgInfo from "../pkg-info.js"

import { dirname } from "path"
import moduleLoad from "../module/load.js"
import resolveId from "../path/resolve-id.js"

function hook(Module) {
  const { _tickCallback, argv } = process
  const mainPath = argv[1]
  const { runMain } = Module

  Module.runMain = function () {
    Module.runMain = runMain

    const filePath = resolveId(mainPath, null, { isMain: true })
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
