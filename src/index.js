import Module from "./module.js"
import Package from "./package.js"
import Shim from "./shim.js"

import assign from "./util/assign.js"
import clone from "./module/clone.js"
import errors from "./errors.js"
import isCLI from "./env/is-cli.js"
import isCheck from "./env/is-check.js"
import isEval from "./env/is-eval.js"
import isInstalled from "./util/is-installed.js"
import isInternal from "./env/is-internal.js"
import isObject from "./util/is-object.js"
import isObjectLike from "./util/is-object-like.js"
import isREPL from "./env/is-repl.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import processHook from "./hook/process.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import vm from "vm"
import vmHook from "./hook/vm.js"

const {
  ERR_INVALID_ARG_TYPE
} = errors

const BuiltinModule = __non_webpack_module__.constructor

let exported

if (shared.inited) {
  Shim.enable(shared.unsafeContext)

  exported = (mod, options) => {
    if (! isObject(mod)) {
      throw new ERR_INVALID_ARG_TYPE("module", "object")
    }

    let cacheKey

    if (isObjectLike(options)) {
      cacheKey = JSON.stringify(options)
    } else {
      const pkg = Package.from(mod)
      const pkgOptions = pkg && pkg.options

      if (pkgOptions) {
        cacheKey = JSON.stringify(pkgOptions)
      }
    }

    const cloned = clone(mod)

    if (cacheKey) {
      const { cache } = shared.package

      Package.cache =
        cache[cacheKey] ||
        (cache[cacheKey] = { __proto__: null })
    }

    if (isObjectLike(options)) {
      const parentPkg = Package.from(cloned, true)
      assign(parentPkg.options, Package.createOptions(options))
    }

    moduleHook(Module, cloned)

    if (! isInstalled(mod)) {
      processHook(process)
    }

    return requireHook(cloned)
  }
} else {
  exported = shared
  exported.inited = true

  Shim.enable(shared.safeContext)
  Shim.enable(shared.unsafeContext)

  if (isCheck()) {
    vmHook(vm)
  } else if (isEval()) {
    BuiltinModule.prototype._compile = Module.prototype._compile
    moduleHook(Module)
    processHook(process)
    vmHook(vm)
  } else if (isREPL()) {
    moduleHook(Module)
    processHook(process)
    vmHook(vm)
  } else if (isCLI() ||
      isInternal()) {
    moduleHook(BuiltinModule)
    mainHook(BuiltinModule)
    processHook(process)
  }
}

export default exported
