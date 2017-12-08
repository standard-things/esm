"use strict"

const assert = require("assert")

module.exports = () => {
  const exported = require("../fixture/file-extension/no-ext-js")
  assert.ok(exported)
}
