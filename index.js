/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")
const zlib = require("zlib")

const esmPath = path.resolve(__dirname, "esm.js.gz")
const inspectKey = util.inspect.custom || "inspect"

const descriptor = Object.create(null)
descriptor.value = () => "@std/esm enabled"

const mod = new module.constructor(module.id)
mod.filename = __filename
mod.parent = module.parent

const scriptOptions = Object.create(null)
scriptOptions.filename = __filename

const content =
  "(function(require,module,__filename){" +
  zlib.gunzipSync(fs.readFileSync(esmPath)).toString() +
  "\n})"

const compiled = vm.runInThisContext(content, scriptOptions)

function makeLoaderFunction() {
  compiled(require, mod, __filename)
  return mod.exports
}

const loader = makeLoaderFunction()

module.exports = (mod, options) => {
  const type = typeof options

  if (options === true ||
      type === "function" ||
      (type === "object" && options !== null)) {
    return makeLoaderFunction()(mod, options)
  }

  return loader(mod, options)
}

Object.freeze(Object.defineProperty(module.exports, inspectKey, descriptor))
