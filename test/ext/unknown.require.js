"use strict"

const assert = require("assert")

module.exports = () => {
  assert.doesNotThrow(() => require("../fixture/ext/a.js.unknown"))
}
