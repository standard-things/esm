import Module from "./module.js"
import Package from "./package.js"

import assign from "./util/assign.js"
import clone from "./module/clone.js"
import errors from "./errors.js"
import isCLI from "./env/is-cli.js"
import isCheck from "./env/is-check.js"
import isEval from "./env/is-eval.js"
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

let exported

if (shared.inited) {
  const { stringify } = JSON

  const nodeModulesRegExp = shared.env.win32
    ? /[\\/]node_modules[\\/]/
    : /\/node_modules\//

  exported = (mod, options) => {
    if (! isObject(mod)) {
      throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "module", "object")
    }

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
        (cache[cacheKey] = { __proto__: null })
    }

    if (isObjectLike(options)) {
      const parentPkg = Package.from(cloned, true)
      assign(parentPkg.options, Package.createOptions(options))
    }

    moduleHook(Module, cloned)

    if (! nodeModulesRegExp.test(mod.filename)) {
      processHook(process)
    }

    return requireHook(cloned)
  }
} else {
  const BuiltinModule = __non_webpack_module__.constructor

  exported = shared
  exported.inited = true

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
  } else if (isCLI()) {
    moduleHook(BuiltinModule)
    mainHook(BuiltinModule)
    processHook(process)
  }
}

export default exported
