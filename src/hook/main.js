import PkgInfo from "../pkg-info.js"

import { dirname } from "path"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(Module) {
  const { _tickCallback, argv } = process
  const [, mainPath] = argv
  const { runMain } = Module

  Module.runMain = function () {
    Module.runMain = runMain

    const filePath = resolveFilename(mainPath, null, { isMain: true })

    if (PkgInfo.get(dirname(filePath)) === null) {
      Module.runMain()
      return
    }

    moduleLoad(filePath, null, true)
    tryTickCallback()
  }

  function tryTickCallback() {
    try {
      _tickCallback.call(process)
    } catch (e) {}
  }
}

export default hook
