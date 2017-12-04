import FastObject from "./fast-object.js"
import Module from "./module.js"
import PkgInfo from "./pkg-info.js"

import clone from "./module/clone.js"
import { dirname } from "path"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import replHook from "./hook/repl.js"
import requireHook from "./hook/require.js"
import vm from "vm"

const BuiltinModule = __non_webpack_module__.constructor

const hooks = new FastObject

let hooked = false

hooks.cli = () => {
  hooked = true
  moduleHook(BuiltinModule)
}

hooks.preload = () => {
  hooked = true
  mainHook(BuiltinModule)
  moduleHook(Module)
}

hooks.repl = () => {
  hooked = true
  replHook(vm)
  moduleHook(Module)
}

hooks.require = (mod, options) => {
  const cloned = clone(mod)

  if (options === true) {
    const pkgInfo = PkgInfo.get(dirname(mod.filename))
    options = pkgInfo ? pkgInfo.options : options
  }

  if (options ||
      ! hooked) {
    moduleHook(Module, cloned, options)
  }

  return requireHook(cloned, options)
}

export default hooks
