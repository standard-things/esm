import Module from "./module.js"

import env from "./env.js"
import { inspect } from "util"
import mainHook from "./hook/main.js"
import moduleHook from "./hook/module.js"
import replHook from "./hook/repl.js"
import requireHook from "./hook/require.js"
import setProperty from "./util/set-property.js"
import vm from "vm"

const BuiltinModule = __non_webpack_module__.constructor
const customSym = inspect.custom
const inspectKey = typeof customSym === "symbol" ? customSym : "inspect"

function hook(mod) {
  return requireHook(mod)
}

if (env.repl) {
  // Enable ESM in the Node REPL by loading @std/esm upon entering.
  // Custom REPLs can still define their own eval functions to bypass this.
  replHook(vm)
} else if (env.preload &&
    process.argv.length > 1) {
  // Enable ESM in the Node CLI by loading @std/esm with the -r option.
  mainHook(BuiltinModule)
  moduleHook(Module)
} else if (env.mocha) {
  // Enable ESM in Mocha by loading @std/esm with the -r option.
  moduleHook(BuiltinModule)
}

setProperty(hook, inspectKey, {
  configurable: false,
  enumerable: false,
  value: () => "@std/esm enabled",
  writable: false
})

export default Object.freeze(hook)
