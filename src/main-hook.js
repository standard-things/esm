import Module from "module"
import PkgInfo from "./pkg-info.js"
import Wrapper from "./wrapper.js"

import path from "path"
import rootModule from "./root-module.js"

const esmPkgMain = __non_webpack_module__.filename
const preloadModules = process._preload_modules || []

if (rootModule.id === "internal/preload" ||
    preloadModules.some((child) => child.filename === esmPkgMain)) {

  const mjsExtRegExp = /\.mjs$/
  const resolveFilename = Module._resolveFilename

  const managerWrapper = function (manager, func) {
    const filePath = path.resolve(process.argv[1])
    const pkgInfo = PkgInfo.get(path.dirname(filePath))
    const wrapped = pkgInfo === null ? null : Wrapper.find(Module, "runMain", pkgInfo.range)

    return wrapped === null
      ? func.call(this)
      : wrapped.call(this, manager, func)
  }

  const methodWrapper = function (manager, func) {
    const filename = resolveFilename(process.argv[1], null, true)

    if (! mjsExtRegExp.test(filename)) {
      func()
      return
    }

    // Load the main module--the command line argument.
    const mod =
    Module._cache[filename] =
    process.mainModule = new Module(filename, null)

    mod.id = "."
    mod.load(filename)

    // Handle any nextTicks added in the first tick of the program.
    process._tickCallback()
  }

  Wrapper.manage(Module, "runMain", managerWrapper)
  Wrapper.wrap(Module, "runMain", methodWrapper)
}
