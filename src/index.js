import "./binding.js"
import "./module/internal/make-require-function.js"
import "./safe/buffer.js"
import "./safe/crypto.js"
import "./safe/process.js"
import "./safe/util.js"
import "./safe/vm.js"
import "./util/prepare-context.js"
import "./util/satisfies.js"

import ENV from "./constant/env.js"

import Loader from "./loader.js"
import Module from "./module.js"
import Package from "./package.js"
import RealModule from "./real/module.js"

import errors from "./errors.js"
import getModuleName from "./util/get-module-name.js"
import globalHook from "./hook/global.js"
import isInstalled from "./util/is-installed.js"
import isObject from "./util/is-object.js"
import isSideloaded from "./env/is-sideloaded.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import pnp from "./pnp.js"
import pnpHook from "./hook/pnp.js"
import processHook from "./hook/process.js"
import realProcess from "./real/process.js"
import realVM from "./real/vm.js"
import requireHook from "./hook/require.js"
import shared from "./shared.js"
import shimFunctionPrototypeToString from "./shim/function-prototype-to-string.js"
import shimProcessBindingUtilGetProxyDetails from "./shim/process-binding-util-get-proxy-details.js"
import vmHook from "./hook/vm.js"

const {
  CHECK,
  CLI,
  EVAL,
  INTERNAL,
  PRELOADED,
  REPL,
  YARN_PNP
} = ENV

const {
  ERR_INVALID_ARG_TYPE
} = errors

const { safeGlobal, unsafeGlobal } = shared

let exported

if (shared.inited &&
    ! shared.reloaded) {
  shimFunctionPrototypeToString.enable(unsafeGlobal)
  shimProcessBindingUtilGetProxyDetails.enable(unsafeGlobal)

  exported = (mod, options) => {
    if (! isObject(mod)) {
      throw new ERR_INVALID_ARG_TYPE("module", "object")
    }

    let cacheKey

    if (options === void 0) {
      const pkg = Package.from(mod)

      if (pkg !== null) {
        cacheKey = JSON.stringify(pkg.options)
      }
    } else {
      options = Package.createOptions(options)

      cacheKey = JSON.stringify({
        name: getModuleName(mod),
        options
      })
    }

    if (cacheKey !== void 0) {
      Loader.init(cacheKey)
    }

    if (options !== void 0) {
      // Resolve the package configuration with forced `options` and cache
      // in `Loader.state.package.cache` after `Loader.state` is initialized.
      Package.from(mod, options)
    }

    moduleHook(Module, mod)

    if (! isInstalled(mod)) {
      processHook(realProcess)
    }

    if (YARN_PNP) {
      pnpHook(pnp)
    }

    return requireHook(mod)
  }
} else {
  exported = shared
  exported.inited = true
  exported.reloaded = false

  shimFunctionPrototypeToString.enable(safeGlobal)
  shimProcessBindingUtilGetProxyDetails.enable(safeGlobal)

  shimFunctionPrototypeToString.enable(unsafeGlobal)
  shimProcessBindingUtilGetProxyDetails.enable(unsafeGlobal)

  if (CHECK) {
    vmHook(realVM)
  } else if (EVAL ||
             REPL) {
    moduleHook(Module)
    processHook(realProcess)
    vmHook(realVM)
  } else if (CLI ||
             INTERNAL ||
             isSideloaded()) {
    moduleHook(RealModule)
    mainHook(RealModule)
    processHook(realProcess)
  }

  if (INTERNAL) {
    globalHook(unsafeGlobal)
  }

  if (PRELOADED &&
      YARN_PNP) {
    pnpHook(pnp)
  }
}

export default exported
