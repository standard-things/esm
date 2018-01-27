"use strict"

const Module = require("module")

const assert = require("assert")
const path = require("path")

const expected = [
  "../../fixture/export/def.js",
  "a",
  "assert"
]

const content = [
  'import("' + expected[0] + '")',
  'import("' + expected[1] + '")',
  'import("' + expected[2] + '")'
].join("\n")

const filename = path.resolve(__dirname, "virtual.js")
const intercepted = []
const mod = new Module(".", null)
const origRequire = Module.prototype.require

Module.prototype.require = function (request) {
  intercepted.push(request)
  return origRequire.apply(this, arguments)
}

try {
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(__dirname)
  mod._compile(content, filename)
} catch (e) {}

module.exports = () => {
  return new Promise((resolve) => setImmediate(() => {
    Module.prototype.require = origRequire

    assert.deepStrictEqual(intercepted.sort(), expected)
    resolve()
  }))
}
