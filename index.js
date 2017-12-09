/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")
const zlib = require("zlib")

// Guard against poorly mocked module constructors.
const Module = module.constructor.length > 1
  ? module.constructor
  : require("module")

const esmPath = path.resolve(__dirname, "esm.js.gz")

const content =
  "(function(require,module,__shared__){" +
  zlib.gunzipSync(fs.readFileSync(esmPath)) +
  "\n})"

const scriptOptions = Object.create(null)
scriptOptions.filename = __filename

const compiled = vm.runInThisContext(content, scriptOptions)

function load() {
  compiled(require, mod, shared)
  return mod.exports
}

function makeRequireFunction(mod, options) {
  return load()(mod, options)
}

const mod = new Module(module.id, null)
mod.filename = __filename
mod.parent = module.parent

let shared
shared = load()

const descriptor = Object.create(null)
descriptor.value = () => "@std/esm enabled"

const inspectKey = util.inspect.custom || "inspect"
Object.defineProperty(makeRequireFunction, inspectKey, descriptor)

Object.freeze(makeRequireFunction)
module.exports = makeRequireFunction
