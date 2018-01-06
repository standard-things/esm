import FastObject from "./fast-object.js"
import Module from "./module.js"
import PkgInfo from "./pkg-info.js"

import clone from "./module/clone.js"
import env from "./env.js"
import isObjectLike from "./util/is-object-like.js"
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
      const pkgInfo = PkgInfo.from(mod)
      const pkgOptions = pkgInfo && pkgInfo.options

      if (pkgOptions) {
        cacheKey = stringify(pkgOptions)
      }
    }

    const cloned = clone(mod)

    if (cacheKey) {
      PkgInfo.cache =
        shared.pkgInfo[cacheKey] ||
        (shared.pkgInfo[cacheKey] = new FastObject)
    }

    moduleHook(Module, cloned, options)
    return requireHook(cloned, options)
  }
} else {
  exported = shared
  shared.inited = true

  if (env.repl) {
    replHook(vm)
    moduleHook(Module)
  } else if (env.cli) {
    const BuiltinModule = __non_webpack_module__.constructor
    mainHook(BuiltinModule)
    moduleHook(BuiltinModule)
  }
}

export default exported
