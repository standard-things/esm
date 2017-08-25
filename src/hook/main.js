import Module from "../module.js"
import PkgInfo from "../pkg-info.js"
import Wrapper from "../wrapper.js"

import { dirname } from "path"
import env from "../env.js"
import moduleHook from "../hook/module.js"
import resolveId from "../path/resolve-id.js"

const { _tickCallback, argv } = process

if (env.preload && argv.length > 1) {
  // Enable ESM in the Node CLI by loading @std/esm with the -r option.
  const BuiltinModule = __non_webpack_module__.constructor
  const mainPath = argv[1]

  const managerWrapper = function (manager, func, args) {
    const filePath = resolveId(mainPath, null, { isMain: true })
    const pkgInfo = PkgInfo.get(dirname(filePath))
    let wrapped = null

    if (pkgInfo !== null) {
      wrapped = Wrapper.find(BuiltinModule, "runMain", pkgInfo.range)
    }

    return wrapped === null
      ? func.apply(this, args)
      : wrapped.call(this, manager, func, filePath)
  }

  const tryTickCallback = () => {
    try {
      _tickCallback()
    } catch (e) {}
  }

  const methodWrapper = function (manager, func, filePath) {
    Module._load(filePath, null, true)

    // Handle any nextTicks added in the first tick of the program.
    tryTickCallback()
  }

  Wrapper.manage(BuiltinModule, "runMain", managerWrapper)
  Wrapper.wrap(BuiltinModule, "runMain", methodWrapper)
  moduleHook(Module)
}
