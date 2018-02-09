import FastObject from "./fast-object.js"
import Module from "./module.js"
import Package from "./package.js"

import assign from "./util/assign.js"
import clone from "./module/clone.js"
import isCLI from "./env/is-cli.js"
import isCheck from "./env/is-check.js"
import isEval from "./env/is-eval.js"
import isObjectLike from "./util/is-object-like.js"
import isREPL from "./env/is-repl.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import vm from "vm"
import vmHook from "./hook/vm.js"

const { stringify } = JSON

const BuiltinModule = __non_webpack_module__.constructor

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
      const { cache } = shared.package

      Package.cache =
        cache[cacheKey] ||
        (cache[cacheKey] = new FastObject)
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

  if (isCheck()) {
    vmHook(vm)
  } else if (isEval()) {
    BuiltinModule.prototype._compile = Module.prototype._compile
    moduleHook(Module)
    vmHook(vm)
  } else if (isREPL()) {
    moduleHook(Module)
    vmHook(vm)
  } else if (isCLI()) {
    moduleHook(BuiltinModule)
    mainHook(BuiltinModule)
  }
}

export default exported
