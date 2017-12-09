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

let exported

if (shared.inited) {
  exported = (mod, options) => {
    const cloned = clone(mod)

    if (! isObjectLike(options)) {
      const pkgInfo = PkgInfo.from(mod)
      options = pkgInfo && pkgInfo.options
    }

    if (options) {
      moduleHook(Module, cloned, options)
    }

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
