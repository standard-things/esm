import Module from "module"
import PkgInfo from "../pkg-info.js"
import Wrapper from "../wrapper.js"

import path from "path"
import rootModule from "../root-module.js"

const esmPkgMain = __non_webpack_module__.filename
const preloadModules = process._preload_modules || []

if (rootModule.id === "internal/preload" ||
    preloadModules.some((child) => child.filename === esmPkgMain)) {
  // Enable ESM in the Node CLI by loading @std/esm with the -r option.
  const resolveFilename = Module._resolveFilename

  const managerWrapper = function (manager, func, args) {
    const filePath = resolveFilename(process.argv[1], null, true)
    const pkgInfo = PkgInfo.get(path.dirname(filePath))
    const wrapped = pkgInfo === null ? null : Wrapper.find(Module, "runMain", pkgInfo.range)

    return wrapped === null
      ? func.apply(this, args)
      : wrapped.call(this, manager, func, filePath, args)
  }

  const methodWrapper = function (manager, func, filePath, args) {
     /* eslint consistent-return: off */
    if (! filePath.endsWith(".mjs")) {
      return func.apply(this, args)
    }

    // Load the main module from the command line argument.
    const mod =
    process.mainModule = new Module(filePath, null)

    mod.id = "."
    tryModuleLoad(mod, filePath)

    // Handle any nextTicks added in the first tick of the program.
    process._tickCallback()
  }

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

  Wrapper.manage(Module, "runMain", managerWrapper)
  Wrapper.wrap(Module, "runMain", methodWrapper)
}
