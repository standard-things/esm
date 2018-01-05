/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")
const zlib = require("zlib")

// Guard against mocked environments (e.g. Jest).
const useBuiltins = module.constructor.length > 1

const Module = useBuiltins ? module.constructor : require("module")

const stdMod = new Module(module.id, null)
const stdPath = path.resolve(__dirname, "esm.js.gz")
const stdReq = useBuiltins ? require : stdMod.require

stdMod.filename = __filename
stdMod.parent = module.parent

const content =
  "(function(require,module,__shared__){" +
  zlib.gunzipSync(fs.readFileSync(stdPath)) +
  "\n})"

const scriptOptions = Object.create(null)
scriptOptions.filename = __filename

const compiled = vm.runInThisContext(content, scriptOptions)

function load() {
  compiled(stdReq, stdMod, shared)
  return stdMod.exports
}

function makeRequireFunction(mod, options) {
  return load()(mod, options)
}

let shared
shared = load()

const descriptor = Object.create(null)
descriptor.value = () => "@std/esm enabled"

const inspectKey = util.inspect.custom || "inspect"
Object.defineProperty(makeRequireFunction, inspectKey, descriptor)

Object.freeze(makeRequireFunction)
module.exports = makeRequireFunction
