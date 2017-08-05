import "./hook/compile.js"
import "./hook/main.js"
import "./hook/repl.js"

import { inspect } from "util"
import setProperty from "./util/set-property.js"

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
