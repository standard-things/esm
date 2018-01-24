import FastObject from "./fast-object.js"
import Module from "./module.js"
import Package from "./package.js"

import assign from "./util/assign.js"
import clone from "./module/clone.js"
import isCLI from "./env/is-cli.js"
import isObjectLike from "./util/is-object-like.js"
import isREPL from "./env/is-repl.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import replHook from "./hook/repl.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import vm from "vm"

const { stringify } = JSON

let exported

if (shared.inited) {
  exported = (mod, options) => {
    let cacheKey

    if (isObjectLike(options)) {
      cacheKey = stringify(options)
    } else {
      const pkg = Package.from(mod)
      const pkgOptions = pkg && pkg.options

      if (pkgOptions) {
        cacheKey = stringify(pkgOptions)
      }
    }

    const cloned = clone(mod)

    if (cacheKey) {
      Package.cache =
        shared.package[cacheKey] ||
        (shared.package[cacheKey] = new FastObject)
    }

    if (isObjectLike(options)) {
      const parentPkg = Package.from(cloned, true)
      assign(parentPkg.options, Package.createOptions(options))
    }

    moduleHook(Module, cloned)
    return requireHook(cloned)
  }
} else {
  exported = shared
  shared.inited = true

  if (isREPL()) {
    moduleHook(Module)
    replHook(vm)
  } else if (isCLI()) {
    const BuiltinModule = __non_webpack_module__.constructor
    moduleHook(BuiltinModule)
    mainHook(BuiltinModule)
  }
}

export default exported
