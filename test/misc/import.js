"use strict"

const assert = require("assert")

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

module.exports = () =>
  import("../fixture/export/abc.mjs")
    .then((ns) => assert.deepEqual(ns, abcNs))
