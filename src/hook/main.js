import Module, { _resolveFilename } from "module"
import PkgInfo from "../pkg-info.js"
import Wrapper from "../wrapper.js"

import { dirname } from "path"
import rootModule from "../root-module.js"

const _preloadModules = process._preload_modules || []
const { _tickCallback } = process
const esmPkgMain = __non_webpack_module__.filename
const mainPath = process.argv[1]

if (rootModule.id === "internal/preload" ||
    _preloadModules.some((child) => child.filename === esmPkgMain)) {
  // Enable ESM in the Node CLI by loading @std/esm with the -r option.
  const managerWrapper = function (manager, func, args) {
    const filePath = _resolveFilename(mainPath, null, true)
    const pkgInfo = PkgInfo.get(dirname(filePath))
    const wrapped = pkgInfo === null ? null : Wrapper.find(Module, "runMain", pkgInfo.range)

    return wrapped === null
      ? func.apply(this, args)
      : wrapped.call(this, manager, func, filePath, args)
  }

  // Hack: Keep `tryModuleLoad` above `methodWrapper` to avoid an UglifyJS bug.
  const tryModuleLoad = (mod, filePath) => {
    let threw = true
    Module._cache[filePath] = mod

    try {
      mod.load(filePath)
      threw = false
    } finally {
      if (threw) {
        delete Module._cache[filePath]
      }
    }
  }

  const methodWrapper = function (manager, func, filePath, args) {
    if (! filePath.endsWith(".mjs")) {
      // eslint-disable-next-line consistent-return
      return func.apply(this, args)
    }

    // Load the main module from the command line argument.
    const mod =
    process.mainModule = new Module(filePath, null)

    mod.id = "."
    tryModuleLoad(mod, filePath)

    // Handle any nextTicks added in the first tick of the program.
    _tickCallback()
  }

  Wrapper.manage(Module, "runMain", managerWrapper)
  Wrapper.wrap(Module, "runMain", methodWrapper)
}
