"use strict"

const assert = require("assert")

function check(done) {
  import("../file-extension/a.mjs").then((ns) => {
    assert.deepEqual(ns, { a: "a", b: "b", c: "c" })
    done()
  })
}

module.exports = check
