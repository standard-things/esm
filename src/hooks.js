import FastObject from "./fast-object.js"
import Module from "./module.js"
import PkgInfo from "./pkg-info.js"

import clone from "./module/clone.js"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import replHook from "./hook/repl.js"
import requireHook from "./hook/require.js"
import vm from "vm"

const BuiltinModule = __non_webpack_module__.constructor

let hooked = false

const hooks = new FastObject

hooks.cli = () => {
  if (! hooked) {
    hooked = true
    mainHook(BuiltinModule)
    moduleHook(BuiltinModule)
  }
}

hooks.repl = () => {
  if (! hooked) {
    hooked = true
    replHook(vm)
    moduleHook(Module)
  }
}

hooks.require = (mod, options) => {
  const cloned = clone(mod)

  if (options === true) {
    const pkgInfo = PkgInfo.from(mod)
    options = pkgInfo && pkgInfo.options
  }

  if (options ||
      ! hooked) {
    moduleHook(Module, cloned, options)
  }

  return requireHook(cloned, options)
}

export default hooks
