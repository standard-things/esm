"use strict"

const assert = require("assert")
const path = require("path")
const livePath = path.resolve("fixture/live.mjs")

module.exports = () => {
  const makeRequire = require("../../index.js")
  const esmRequire = makeRequire(module)

  Reflect.deleteProperty(esmRequire.cache, livePath)

  const live = esmRequire(livePath)

  live.reset()
  assert.strictEqual(live.value, 0)

  live.add(2)
  live.add(2)
  assert.strictEqual(live.value, 4)

  assert.strictEqual(live.reset(), 0)
  assert.strictEqual(live.value, 0)
}
