import "./compile-hook.js"
import "./repl-hook.js"

import setProperty from "./util/set-property.js"
import util from "util"

const customSym = util.inspect.custom
const inspectKey = typeof customSym === "symbol" ? customSym : "inspect"
const exports = Object.create(null)

setProperty(exports, inspectKey, {
  configurable: false,
  enumerable: false,
  value: () => "@std/esm enabled",
  writable: false
})

export default Object.freeze(exports)
