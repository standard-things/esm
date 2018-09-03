import Module from "../module.js"
import Package from "../package.js"
import Wrapper from "../wrapper.js"

import call from "../util/call.js"
import { dirname } from "../safe/path.js"
import esmParseLoad from "../module/esm/parse-load.js"
import esmResolveFilename from "../module/esm/resolve-filename.js"
import getSilent from "../util/get-silent.js"
import realProcess from "../real/process.js"
import relaxRange from "../util/relax-range.js"

function hook(Mod) {
  const _tickCallback = getSilent(realProcess, "_tickCallback")
  const useTickCallback = typeof _tickCallback === "function"

  function managerWrapper(manager, func, args) {
    const [, mainPath] = realProcess.argv
    const filename = tryResolveFilename(mainPath)
    const pkg = Package.from(filename)
    const wrapped = Wrapper.find(Mod, "runMain", relaxRange(pkg.range))

    return wrapped
      ? Reflect.apply(wrapped, this, [manager, func, args])
      : Reflect.apply(func, this, args)
  }

  function methodWrapper() {
    const [, mainPath] = realProcess.argv
    const filename = tryResolveFilename(mainPath)
    const defaultPkg = Package.state.default
    const dirPath = dirname(filename)

    if (Package.get(dirPath) === defaultPkg) {
      // Clone the default package to avoid the parsing phase fallback path
      // of module/internal/compile.
      Package.set(dirPath, defaultPkg.clone())
    }

    esmParseLoad(mainPath, null, true)
    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      call(_tickCallback, realProcess)
    }
  }

  function tryResolveFilename(request) {
    let error

    try {
      return esmResolveFilename(request, null, true)
    } catch (e) {
      error = e
    }

    try {
      return Module._resolveFilename(request, null, true)
    } catch {}

    throw error
  }

  Wrapper.manage(Mod, "runMain", managerWrapper)
  Wrapper.wrap(Mod, "runMain", methodWrapper)

  Module.runMain = Mod.runMain
}

export default hook
