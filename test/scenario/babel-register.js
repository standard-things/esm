"use strict"

const assert = require("assert")
const def = require("../fixture/scenario/babel-register")

module.exports = () => {
  assert.strictEqual(def.a, "a")
}
