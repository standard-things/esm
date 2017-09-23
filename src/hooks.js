import FastObject from "./fast-object.js"
import Module from "./module.js"
import PkgInfo from "./pkg-info.js"

import { dirname } from "path"
import keys from "./util/keys.js"
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
    const pkgInfo = PkgInfo.get(dirname(mod.filename))

    if (pkgInfo) {
      options = pkgInfo.options
    }
  }

  const copy = new Module(mod.id, null)
  const names = keys(mod)

  for (const name of names) {
    if (name !== "constructor") {
      copy[name] = mod[name]
    }
  }

  copy.id = mod.id
  copy.filename = mod.filename
  copy.parent = mod.parent

  moduleHook(Module, copy, options)

  const req = requireHook(copy, options)
  req.extensions = Module._extensions
  return req
}

export default hooks
