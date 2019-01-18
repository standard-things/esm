import Loader from "../loader.js"
import Module from "../module.js"
import Package from "../package.js"
import Wrapper from "../wrapper.js"

import { dirname } from "../safe/path.js"
import dualResolveFilename from "../module/internal/dual-resolve-filename.js"
import esmParseLoad from "../module/esm/parse-load.js"
import getSilent from "../util/get-silent.js"
import realProcess from "../real/process.js"
import relaxRange from "../util/relax-range.js"

function hook(Mod) {
  function managerWrapper(manager, func, args) {
    const [, mainPath] = realProcess.argv
    const filename = dualResolveFilename(mainPath, null, true)
    const pkg = Package.from(filename)
    const wrapped = Wrapper.find(Mod, "runMain", relaxRange(pkg.range))

    return wrapped
      ? Reflect.apply(wrapped, this, [manager, func, args])
      : Reflect.apply(func, this, args)
  }

  function methodWrapper() {
    const [, mainPath] = realProcess.argv
    const filename = dualResolveFilename(mainPath, null, true)
    const defaultPkg = Loader.state.package.default
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
    const _tickCallback = getSilent(realProcess, "_tickCallback")

    if (typeof _tickCallback === "function") {
      Reflect.apply(_tickCallback, realProcess, [])
    }
  }

  Wrapper.manage(Mod, "runMain", managerWrapper)
  Wrapper.wrap(Mod, "runMain", methodWrapper)

  Module.runMain = Mod.runMain
}

export default hook
