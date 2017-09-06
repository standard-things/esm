import FastObject from "./fast-object.js"
import Module from "./module.js"
import PkgInfo from "./pkg-info.js"

import { dirname } from "path"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import replHook from "./hook/repl.js"
import requireHook from "./hook/require.js"
import vm from "vm"

const BuiltinModule = __non_webpack_module__.constructor

const hooks = new FastObject

hooks.cli = () => {
  moduleHook(BuiltinModule)
}

hooks.preload = () => {
  mainHook(BuiltinModule)
  moduleHook(Module)
}

hooks.repl = () => {
  replHook(vm)
  moduleHook(Module)
}

hooks.require = (mod, options) => {
  if (options === true) {
    options = PkgInfo.get(dirname(mod.filename))
  }

  moduleHook(Module, options)
  return requireHook(mod, options)
}

export default hooks
