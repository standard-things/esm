"use strict"

const assert = require("assert")

module.exports = function (done) {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  import("../fixture/file-extension/a.mjs")
    .then((ns) => {
      assert.deepEqual(ns, abcNs)
      done()
    })
}
