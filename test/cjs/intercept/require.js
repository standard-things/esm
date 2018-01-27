"use strict"

const Module = require("module").Module

const expected = [
  "assert",
  "a",
  "../../fixture/export/def.js"
]

const intercepted = []
const origRequire = Module.prototype.require

Module.prototype.require = function (request) {
  intercepted.push(request)
  return origRequire.apply(this, arguments)
}

let assert

try {
  assert = require(expected[0])
  require(expected[1])
  require(expected[2])
} finally {
  Module.prototype.require = origRequire
}

module.exports = () => {
  assert.deepStrictEqual(intercepted, expected)
}
