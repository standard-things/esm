"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../../fixture/cjs/ext/no-ext-cjs")
}
