/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")
const zlib = require("zlib")

const esmPath = path.join(__dirname, "esm.js.gz")

const content =
  "(function(require,module,__filename){" +
  zlib.gunzipSync(fs.readFileSync(esmPath)).toString() +
  "\n})"

const compiled = vm.runInThisContext(content, {
  displayErrors: true,
  filename: esmPath
})

const mod = new module.constructor(module.id)
mod.filename = __filename
mod.parent = module.parent

const inspectKey = typeof util.inspect.custom === "symbol"
  ? util.inspect.custom
  : "inspect"

const loader = makeLoaderFunction()

function makeLoaderFunction() {
  compiled(require, mod, __filename)
  return mod.exports
}

module.exports = (mod, options) => {
  const type = typeof options

  if (options === true ||
      type === "function" ||
      (type === "object" && options !== null)) {
    return makeLoaderFunction()(mod, options)
  }

  return loader(mod, options)
}

Object.defineProperty(module.exports, inspectKey, {
  configurable: false,
  enumerable: false,
  value: () => "@std/esm enabled",
  writable: false
})

Object.freeze(module.exports)
