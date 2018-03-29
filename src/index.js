import ENV from "./constant/env.js"

import Module from "./module.js"
import Package from "./package.js"
import RealModule from "./real/module.js"
import Shim from "./shim.js"

import assign from "./util/assign.js"
import clone from "./module/clone.js"
import errors from "./errors.js"
import globalHook from "./hook/global.js"
import isInstalled from "./util/is-installed.js"
import isObject from "./util/is-object.js"
import isObjectLike from "./util/is-object-like.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import processHook from "./hook/process.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import vm from "vm"
import vmHook from "./hook/vm.js"

const {
  CLI,
  CHECK,
  EVAL,
  INTERNAL,
  REPL
} = ENV

const {
  ERR_INVALID_ARG_TYPE
} = errors

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

  if (CHECK) {
    vmHook(vm)
  } else if (EVAL) {
    RealModule.prototype._compile = Module.prototype._compile
    moduleHook(Module)
    processHook(process)
    vmHook(vm)
  } else if (REPL) {
    moduleHook(Module)
    processHook(process)
    vmHook(vm)
  } else if (CLI ||
      INTERNAL) {
    moduleHook(RealModule)
    mainHook(RealModule)
    processHook(process)
  }

  if (INTERNAL) {
    globalHook(shared.unsafeContext)
  }
}

export default exported
