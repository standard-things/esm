import "./hook/main.js"
import "./hook/repl.js"

import env from "./env.js"
import { inspect } from "util"
import moduleHook from "./hook/module.js"
import setProperty from "./util/set-property.js"

if (! env.preload) {
  const BuiltinModule = __non_webpack_module__.constructor
  moduleHook(BuiltinModule)
}

const customSym = inspect.custom
const inspectKey = typeof customSym === "symbol" ? customSym : "inspect"
const exports = Object.create(null)

setProperty(exports, inspectKey, {
  configurable: false,
  enumerable: false,
  value: () => "@std/esm enabled",
  writable: false
})

export default Object.freeze(exports)
