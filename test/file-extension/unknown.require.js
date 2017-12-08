"use strict"

const assert = require("assert")

module.exports = () => {
  const exported = require("../fixture/file-extension/a.js.unknown")
  assert.ok(exported)
}
