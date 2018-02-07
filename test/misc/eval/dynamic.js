"use strict"

const assert = require("assert")
const createNamespace = require("../../create-namespace.js")

module.exports = () => {
  const abcNs = createNamespace({
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  })

  const defNs = createNamespace({
    default: { d: "d", e: "e", f: "f" }
  })

  return Promise
    .all([
      "../../fixture/eval/direct/dynamic.js",
      "../../fixture/eval/indirect/dynamic.js"
    ].map((request) =>
      require(request)
        .then((actual) => assert.deepStrictEqual(actual, [abcNs, defNs]))
    ))
}
