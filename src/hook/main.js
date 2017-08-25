import PkgInfo from "../pkg-info.js"
import Wrapper from "../wrapper.js"

import { dirname } from "path"
import moduleLoad from "../module/load.js"
import resolveId from "../path/resolve-id.js"

const { _tickCallback, argv } = process
const mainPath = argv[1]

function hook(Module) {
  function managerWrapper(manager, func, args) {
    const filePath = resolveId(mainPath, null, { isMain: true })
    const pkgInfo = PkgInfo.get(dirname(filePath))
    let wrapped = null

    if (pkgInfo !== null) {
      wrapped = Wrapper.find(Module, "runMain", pkgInfo.range)
    }

    return wrapped === null
      ? func.apply(this, args)
      : wrapped(filePath)
  }

  function methodWrapper(filePath) {
    moduleLoad(filePath, null, true)
    tryTickCallback()
  }

  function tryTickCallback() {
    try {
      _tickCallback()
    } catch (e) {}
  }

  Wrapper.manage(Module, "runMain", managerWrapper)
  Wrapper.wrap(Module, "runMain", methodWrapper)
}

export default hook
