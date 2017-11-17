"use strict"

const assert = require("assert")
const createNamespace = require("../../create-namespace.js")

const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

module.exports = () => {
  return import("../../fixture/export/abc.mjs")
    .then((ns) => assert.deepStrictEqual(ns, abcNs))
}
