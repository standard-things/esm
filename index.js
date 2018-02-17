/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")

// Guard against mocked environments (e.g. Jest).
const useBuiltins = module.constructor.length > 1

const Module = useBuiltins ? module.constructor : require("module")

const stdFilename = path.resolve(__dirname, "esm.js")
const stdMod = new Module(module.id, null)
const stdReq = useBuiltins ? require : (request) => stdMod.require(request)

stdMod.filename = __filename
stdMod.parent = module.parent

const content =
  "(function(require,module,__shared__){" +
  fs.readFileSync(stdFilename, "utf8") +
  "\n})"

const compiled = vm.runInThisContext(content, {
  __proto__: null,
  filename: __filename
})

function load() {
  compiled(stdReq, stdMod, shared)
  return stdMod.exports
}

function makeRequireFunction(mod, options) {
  return load()(mod, options)
}

let shared
shared = load()
shared.global = global

const inspectKey = util.inspect.custom || "inspect"

Object.defineProperty(makeRequireFunction, inspectKey, {
  __proto__: null,
  value: () => "@std/esm enabled"
})

Object.freeze(makeRequireFunction)
module.exports = makeRequireFunction
