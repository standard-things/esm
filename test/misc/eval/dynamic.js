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
  return Promise
    .all([
      { id: "../../fixture/eval/direct/dynamic/cjs.js", ns: defNs },
      { id: "../../fixture/eval/direct/dynamic/esm.js", ns: abcNs },
      { id: "../../fixture/eval/indirect/dynamic/cjs.js", ns: defNs },
      { id: "../../fixture/eval/indirect/dynamic/esm.js", ns: abcNs }
    ].map((data) =>
      require(data.id)
        .then((ns) => assert.deepStrictEqual(ns, data.ns))
    ))
}
