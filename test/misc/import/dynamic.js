"use strict"

const assert = require("assert")
const createNamespace = require("../../create-namespace.js")

const abcNs = createNamespace({
  a: "a",
  b: "b",
  c: "c",
  default: "default"
})

const defNs = createNamespace({
  default: { d: "d", e: "e", f: "f" }
})

module.exports = () => {
  return [
    { id: "../../fixture/import/dynamic/cjs.js", ns: defNs },
    { id: "../../fixture/import/dynamic/esm.js", ns: abcNs }
  ].reduce((promise, data) =>
    promise
      .then(() => require(data.id))
      .then((ns) => assert.deepStrictEqual(ns, data.ns))
  , Promise.resolve())
}
