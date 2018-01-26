"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../../fixture/cjs/ext/a.js.unknown")
    .then(() => assert.ok(true))
}
