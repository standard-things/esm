// Load modules referenced by their `shared.module` cache entry.
import "./binding.js"
import "./safe/buffer.js"
import "./safe/crypto.js"
import "./safe/path.js"
import "./safe/process.js"
import "./safe/util.js"
import "./util/satisfies.js"

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
import isSideloaded from "./env/is-sideloaded.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import processHook from "./hook/process.js"
import realProcess from "./real/process.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import vm from "vm"
import vmHook from "./hook/vm.js"

const {
  CHECK,
  CLI,
  EVAL,
  INTERNAL,
  REPL
} = ENV

const {
  ERR_INVALID_ARG_TYPE
} = errors

let exported

if (shared.inited &&
    ! shared.reloaded) {
  Shim.enable(shared.unsafeContext)

  exported = (mod, options) => {
    if (! isObject(mod)) {
      throw new ERR_INVALID_ARG_TYPE("module", "object")
    }

    let cacheKey

    if (isObjectLike(options)) {
      cacheKey = JSON.stringify(Package.createOptions(options))
    } else {
      const pkg = Package.from(mod)

      if (pkg) {
        cacheKey = JSON.stringify(pkg.options)
      }
    }

    const cloned = clone(mod)

    if (cacheKey) {
      const { state } = shared.package

      Package.state =
        state[cacheKey] ||
        (state[cacheKey] = {
          cache: { __proto__: null },
          default: null
        })
    }

    if (isObjectLike(options)) {
      const parentPkg = Package.from(cloned, true)

      assign(parentPkg.options, Package.createOptions(options))
    }

    moduleHook(Module, cloned)

    if (! isInstalled(mod)) {
      processHook(realProcess)
    }

    return requireHook(cloned)
  }
} else {
  exported = shared
  exported.inited = true
  exported.reloaded = false

  Shim.enable(shared.safeContext)
  Shim.enable(shared.unsafeContext)

  if (CHECK) {
    vmHook(vm)
  } else if (EVAL) {
    RealModule.prototype._compile = Module.prototype._compile
    moduleHook(Module)
    processHook(realProcess)
    vmHook(vm)
  } else if (REPL) {
    moduleHook(Module)
    processHook(realProcess)
    vmHook(vm)
  } else if (CLI ||
      INTERNAL ||
      isSideloaded()) {
    moduleHook(RealModule)
    mainHook(RealModule)
    processHook(realProcess)
  }

  if (INTERNAL) {
    globalHook(shared.unsafeContext)
  }
}

export default exported
